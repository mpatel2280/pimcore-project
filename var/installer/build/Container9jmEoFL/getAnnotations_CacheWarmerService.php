<?php

namespace Container9jmEoFL;

use Symfony\Component\DependencyInjection\Argument\RewindableGenerator;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\Exception\RuntimeException;

/**
 * @internal This class has been auto-generated by the Symfony Dependency Injection Component.
 */
class getAnnotations_CacheWarmerService extends Pimcore_Bundle_InstallBundle_InstallerKernelDevDebugContainer
{
    /**
     * Gets the private 'annotations.cache_warmer' shared service.
     *
     * @return \Symfony\Bundle\FrameworkBundle\CacheWarmer\AnnotationsCacheWarmer
     *
     * @deprecated Since symfony/framework-bundle 6.4: The "annotations.cache_warmer" service is deprecated without replacement.
     */
    public static function do($container, $lazyLoad = true)
    {
        trigger_deprecation('symfony/framework-bundle', '6.4', 'The "annotations.cache_warmer" service is deprecated without replacement.');

        return $container->privates['annotations.cache_warmer'] = new \Symfony\Bundle\FrameworkBundle\CacheWarmer\AnnotationsCacheWarmer(($container->privates['annotations.reader'] ?? $container->load('getAnnotations_ReaderService')), (\dirname(__DIR__, 2).'/cache/annotations.php'), '#^Symfony\\\\(?:Component\\\\HttpKernel\\\\|Bundle\\\\FrameworkBundle\\\\Controller\\\\(?!.*Controller$))#', true, false);
    }
}