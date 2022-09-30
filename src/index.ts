import * as aws from '@pulumi/aws'
import { Vpc } from './lib/vpc'
import { Cluster } from './lib/ecs-cluster'
import { WebService } from './lib/sample-webservice'
import * as pulumi from '@pulumi/pulumi'
import { SecurityGroups } from './lib/security-groups'
import { LoadBalancer } from './lib/loadbalancer'
import { providers } from './lib/providers'
import { Cdn } from './lib/cdn'

const stackName = pulumi.getStack()

const vpc = new Vpc(
  stackName,
  {
    numberOfAvailabilityZones: 2,
    numberOfNatGateways: 1,
  },
  { provider: providers[aws.Region.APSoutheast2] },
)

const securityGroups = new SecurityGroups(
  stackName,
  {
    vpcId: vpc.vpcId,
  },
  { provider: providers[aws.Region.APSoutheast2] },
)

const ecsCluster = new Cluster(stackName)

const loadbalancer = new LoadBalancer(
  stackName,
  {
    vpcId: vpc.vpcId,
    subnetIds: vpc.publicSubnetIds,
    securityGroups: [
      // allow outgoing requests to the webservice
      securityGroups.loadBalancerSecurityGroup.id,
    ],
  },
  { provider: providers[aws.Region.APSoutheast2] },
)

new WebService(
  stackName,
  {
    clusterArn: ecsCluster.clusterArn,
    subnetIds: vpc.isolatedSubnetIds,
    securityGroupIds: [
      // allow incoming requests from the load balancer
      securityGroups.webSecurityGroup.id,

      // fargate containers need to be able to connect; see https://docs.aws.amazon.com/AmazonECS/latest/userguide/fargate-task-networking.html
      securityGroups.allowEgressToAll.id,
    ],
    targetGroupArn: loadbalancer.targetGroupArn,
  },
  { provider: providers[aws.Region.APSoutheast2] },
)

const cdn = new Cdn(
  stackName,
  {
    originUrl: loadbalancer.url,
  },
  { provider: providers[aws.Region.USEast1] },
)

export const loadbalancerUrl = loadbalancer.url
export const url = cdn.url
