<?php

declare(strict_types=1);

namespace QaArchitect\SdkSymfony\EventSubscriber;

use QaArchitect\SdkSymfony\Service\TraceCollector;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class QaArchitectSubscriber implements EventSubscriberInterface
{
    private array $requestData = [];

    public function __construct(private readonly TraceCollector $collector)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST   => ['onKernelRequest', 256],
            KernelEvents::RESPONSE  => ['onKernelResponse', -256],
            KernelEvents::EXCEPTION => ['onKernelException', 0],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        $body = null;
        $contentType = $request->headers->get('Content-Type', '');
        if (str_contains($contentType, 'application/json')) {
            $body = json_decode($request->getContent(), true);
        } elseif ($request->request->count() > 0) {
            $body = $request->request->all();
        }

        $this->requestData = [
            'url'     => $request->getUri(),
            'method'  => $request->getMethod(),
            'headers' => $this->sanitizeHeaders($request->headers->all()),
            'body'    => $body,
            'route'   => $request->attributes->get('_route'),
            'controller' => $request->attributes->get('_controller'),
        ];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest() || empty($this->requestData)) {
            return;
        }

        $response = $event->getResponse();

        $responseBody = null;
        $contentType = $response->headers->get('Content-Type', '');
        if (str_contains($contentType, 'application/json')) {
            $responseBody = json_decode($response->getContent(), true);
        }

        $this->collector->capture(
            request: $this->requestData,
            response: [
                'status' => $response->getStatusCode(),
                'body'   => $responseBody,
            ],
            context: [
                'controller' => $this->requestData['controller'] ?? null,
                'route'      => $this->requestData['route'] ?? null,
            ]
        );

        $this->requestData = [];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $exception = $event->getThrowable();

        $this->collector->capture(
            request: $this->requestData,
            response: [
                'status' => 500,
                'body'   => ['error' => $exception->getMessage()],
            ],
            context: [
                'controller' => $this->requestData['controller'] ?? null,
                'route'      => $this->requestData['route'] ?? null,
                'exception'  => [
                    'class'       => get_class($exception),
                    'message'     => $exception->getMessage(),
                    'file'        => $exception->getFile(),
                    'line'        => $exception->getLine(),
                    'stack_trace' => array_slice(explode("\n", $exception->getTraceAsString()), 0, 20),
                ],
            ]
        );

        $this->requestData = [];
    }

    private function sanitizeHeaders(array $headers): array
    {
        $sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        $sanitized = [];

        foreach ($headers as $key => $values) {
            $lowerKey = strtolower($key);
            $sanitized[$key] = in_array($lowerKey, $sensitiveKeys, true)
                ? ['[REDACTED]']
                : (array) $values;
        }

        return array_map(fn(array $v) => implode(', ', $v), $sanitized);
    }
}
