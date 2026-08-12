<?php

declare(strict_types=1);

namespace QaArchitect\SdkSymfony\DependencyInjection;

use QaArchitect\SdkSymfony\EventSubscriber\QaArchitectSubscriber;
use QaArchitect\SdkSymfony\Service\TraceCollector;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\Extension;

class QaArchitectExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $config = array_merge([
            'storage_dir'      => '%kernel.project_dir%',
            'server_endpoint'  => 'http://localhost:9000',
            'write_to_file'    => true,
            'send_to_server'   => true,
        ], ...$configs);

        $container->register(TraceCollector::class)
            ->setArguments([
                $config['storage_dir'],
                $config['server_endpoint'],
                $config['write_to_file'],
                $config['send_to_server'],
            ])
            ->setPublic(false);

        $container->register(QaArchitectSubscriber::class)
            ->setArguments([new \Symfony\Component\DependencyInjection\Reference(TraceCollector::class)])
            ->addTag('kernel.event_subscriber')
            ->setPublic(false);
    }
}
