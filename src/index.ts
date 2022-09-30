import * as aws from '@pulumi/aws'
import { Vpc } from "./lib/vpc";
import { Cluster } from "./lib/ecs-cluster";
import { WebService } from "./lib/sample-webservice";
import { SecurityGroups } from "./lib/security-groups";
import { LoadBalancer } from "./lib/loadbalancer";
import { providers } from "./lib/providers";
import { Cdn } from './lib/cdn';

const vpc = new Vpc(
  "vpc",
  {
    numberOfAvailabilityZones: 1,
    numberOfNatGateways: 1,
  },
  { provider: providers[aws.Region.APSoutheast2] }
);

const cluster = new Cluster("ecs");

const securityGroups = new SecurityGroups(
  "security-groups",
  {
    vpcId: vpc.vpcId,
  },
  { provider: providers[aws.Region.APSoutheast2] }
);

const loadbalancer = new LoadBalancer(
  "alb",
  {
    vpcId: vpc.vpcId,
    subnetIds: vpc.publicSubnetIds,
    securityGroups: [securityGroups.loadBalancerSecurityGroup.id],
  },
  { provider: providers[aws.Region.APSoutheast2] }
);

const webservice = new WebService(
  "webservice",
  {
    clusterArn: cluster.arn,
    subnetIds: vpc.privateSubnetIds,
    securityGroupIds: [
      securityGroups.webSecurityGroup.id,
      securityGroups.allowEgressToAll.id,
    ],
    targetGroupArn: loadbalancer.targetGroupArn,
  },
  { provider: providers[aws.Region.APSoutheast2] }
);

const cdn = new Cdn('cdn', {
    originUrl: loadbalancer.url,
}, { provider: providers[aws.Region.USEast1]})

export const url = cdn.distribution.domainName