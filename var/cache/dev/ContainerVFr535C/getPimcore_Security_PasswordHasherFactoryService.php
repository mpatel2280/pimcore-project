<?php

namespace ContainerVFr535C;

use Symfony\Component\DependencyInjection\Argument\RewindableGenerator;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\Exception\RuntimeException;

/**
 * @internal This class has been auto-generated by the Symfony Dependency Injection Component.
 */
class getPimcore_Security_PasswordHasherFactoryService extends App_KernelDevDebugContainer
{
    /**
     * Gets the private 'pimcore.security.password_hasher_factory' shared autowired service.
     *
     * @return \Pimcore\Security\Hasher\PasswordHasherFactory
     */
    public static function do($container, $lazyLoad = true)
    {
        include_once \dirname(__DIR__, 4).'/vendor/symfony/password-hasher/Hasher/PasswordHasherFactoryInterface.php';
        include_once \dirname(__DIR__, 4).'/vendor/pimcore/pimcore/lib/Security/Hasher/PasswordHasherFactory.php';
        include_once \dirname(__DIR__, 4).'/vendor/symfony/password-hasher/Hasher/PasswordHasherFactory.php';
        include_once \dirname(__DIR__, 4).'/vendor/pimcore/pimcore/lib/Security/Hasher/Factory/AbstractHasherFactory.php';
        include_once \dirname(__DIR__, 4).'/vendor/pimcore/pimcore/lib/Security/Hasher/Factory/UserAwarePasswordHasherFactory.php';

        return $container->privates['pimcore.security.password_hasher_factory'] = new \Pimcore\Security\Hasher\PasswordHasherFactory(new \Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactory([]), ['Pimcore\\Security\\User\\User' => new \Pimcore\Security\Hasher\Factory\UserAwarePasswordHasherFactory('Pimcore\\Security\\Hasher\\PimcoreUserPasswordHasher')]);
    }
}