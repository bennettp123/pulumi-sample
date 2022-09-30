import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export class Cluster extends pulumi.ComponentResource {
  clusterName: pulumi.Output<string>
  clusterId: pulumi.Output<string>
  clusterArn: pulumi.Output<string>

  constructor(
    name: string,
    _args?: {},
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('swm-sample:lib/ecs-cluster/Cluster', name, {}, opts)

    const cluster = new aws.ecs.Cluster(
      name,
      {
        settings: [
          {
            name: 'containerInsights',
            value: 'disabled',
          },
        ],
      },
      { parent: this },
    )

    new aws.ecs.ClusterCapacityProviders(
      name,
      {
        clusterName: cluster.name,
        capacityProviders: ['FARGATE_SPOT'],
        defaultCapacityProviderStrategies: [
          {
            capacityProvider: 'FARGATE_SPOT',
            weight: 100,
          },
        ],
      },
      { parent: this },
    )

    this.clusterName = cluster.name
    this.clusterId = cluster.id
    this.clusterArn = cluster.arn
  }
}
