import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export class Cluster extends pulumi.ComponentResource {
    arn: pulumi.Output<string>
    id: pulumi.Output<string>

    constructor(
        name: string,
        _args?: {},
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super('swm-sample:lib/ecs-cluster/Cluster', name, {}, opts)
        const cluster = new aws.ecs.Cluster(
            name,
            {
                capacityProviders: ['FARGATE_SPOT'],
                configuration: {},
                settings: [
                    {
                        name: 'containerInsights',
                        value: 'disabled',
                    },
                ],
            },
            { parent: this },
        )

        this.id = cluster.id
        this.arn = cluster.arn
    }
}
