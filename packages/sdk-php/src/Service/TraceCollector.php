<?php

declare(strict_types=1);

namespace QaArchitect\SdkSymfony\Service;

use Ramsey\Uuid\Uuid;

class TraceCollector
{
    private const MAX_TRACES = 500;

    public function __construct(
        private readonly string $storageDir,
        private readonly string $serverEndpoint = 'http://localhost:9000',
        private readonly bool $writeToFile = true,
        private readonly bool $sendToServer = true,
    ) {
    }

    public function capture(array $request, array $response, array $context = []): void
    {
        $trace = [
            'trace_id'  => Uuid::uuid4()->toString(),
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'type'      => 'http',
            'request'   => $request,
            'response'  => $response,
            'context'   => $context,
        ];

        if ($this->writeToFile) {
            $this->writeToFile($trace);
        }

        if ($this->sendToServer) {
            $this->sendToServer($trace);
        }
    }

    private function writeToFile(array $trace): void
    {
        $qaDir = rtrim($this->storageDir, '/') . '/.qa-architect';
        if (!is_dir($qaDir)) {
            mkdir($qaDir, 0755, true);
        }

        $tracesFile = $qaDir . '/traces.json';
        $current = ['traces' => []];

        if (file_exists($tracesFile)) {
            $raw = file_get_contents($tracesFile);
            if ($raw !== false) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $current = $decoded;
                }
            }
        }

        $current['traces'][] = $trace;

        // Keep last MAX_TRACES only
        if (count($current['traces']) > self::MAX_TRACES) {
            $current['traces'] = array_slice($current['traces'], -self::MAX_TRACES);
        }

        file_put_contents($tracesFile, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    private function sendToServer(array $trace): void
    {
        try {
            $context = stream_context_create([
                'http' => [
                    'method'  => 'POST',
                    'header'  => "Content-Type: application/json\r\n",
                    'content' => json_encode($trace),
                    'timeout' => 1,
                    'ignore_errors' => true,
                ],
            ]);

            @file_get_contents("{$this->serverEndpoint}/api/traces", false, $context);
        } catch (\Throwable) {
            // Non-blocking: telemetry failure must never break the application
        }
    }
}
