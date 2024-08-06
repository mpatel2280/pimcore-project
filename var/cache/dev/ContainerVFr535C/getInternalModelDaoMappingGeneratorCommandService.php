<?php

namespace ContainerVFr535C;

use Symfony\Component\DependencyInjection\Argument\RewindableGenerator;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\Exception\RuntimeException;

/**
 * @internal This class has been auto-generated by the Symfony Dependency Injection Component.
 */
class getInternalModelDaoMappingGeneratorCommandService extends App_KernelDevDebugContainer
{
    /**
     * Gets the private 'Pimcore\Bundle\CoreBundle\Command\InternalModelDaoMappingGeneratorCommand' shared autowired service.
     *
     * @return \Pimcore\Bundle\CoreBundle\Command\InternalModelDaoMappingGeneratorCommand
     */
    public static function do($container, $lazyLoad = true)
    {
        include_once \dirname(__DIR__, 4).'/vendor/symfony/console/Command/Command.php';
        include_once \dirname(__DIR__, 4).'/vendor/pimcore/pimcore/lib/Console/AbstractCommand.php';
        include_once \dirname(__DIR__, 4).'/vendor/pimcore/pimcore/bundles/CoreBundle/src/Command/InternalModelDaoMappingGeneratorCommand.php';

        $container->privates['Pimcore\\Bundle\\CoreBundle\\Command\\InternalModelDaoMappingGeneratorCommand'] = $instance = new \Pimcore\Bundle\CoreBundle\Command\InternalModelDaoMappingGeneratorCommand();

        $instance->setName('internal:model-dao-mapping-generator');
        $instance->setHidden(true);
        $instance->setDescription('For internal use only');

        return $instance;
    }
}