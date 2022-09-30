import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const wellKnown = {
  http: 80 as const,
  https: 443 as const,
};

export class SecurityGroups extends pulumi.ComponentResource {
  webSecurityGroup: aws.ec2.SecurityGroup;
  loadBalancerSecurityGroup: aws.ec2.SecurityGroup;

  /** A permissive security group that allows all outbound access */
  allowEgressToAll: aws.ec2.SecurityGroup;

  constructor(
    name: string,
    args: {
      /** The VPC Id in which the security groups will be created */
      vpcId: pulumi.Input<string>;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("swm-sample:lib/security-groups/SecurityGroups", name, {}, opts);

    const vpc = pulumi
      .output(args.vpcId)
      .apply((id) => aws.ec2.getVpc({ id }, { parent: this }));

    /**
     * Allow outbound TCP and UDP to all IP addresses. Use this
     * everywhere that needs to connect to the internet.
     */
    this.allowEgressToAll = new aws.ec2.SecurityGroup(
      `${name}-sg-egress-allow-all`,
      {
        description:
          "A permissive security group that allows all outbound access",
        revokeRulesOnDelete: true,
        vpcId: vpc.id,
        egress: [
          {
            fromPort: 0,
            toPort: 65535,
            description: "Allow all outbound destinations",
            protocol: "tcp",
            ipv6CidrBlocks: ["::/0"],
          },
          {
            fromPort: 0,
            toPort: 65535,
            description: "Allow all outbound destinations",
            protocol: "udp",
            ipv6CidrBlocks: ["::/0"],
          },
          {
            fromPort: 0,
            toPort: 65535,
            description: "Allow all outbound destinations",
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
          },
          {
            fromPort: 0,
            toPort: 65535,
            description: "Allow all outbound destinations",
            protocol: "udp",
            cidrBlocks: ["0.0.0.0/0"],
          },
        ],
      },
      { parent: this }
    );

    this.webSecurityGroup = new aws.ec2.SecurityGroup(
      `${name}-sg-ecs-task-web`,
      {
        description: "security group for web tasks",
        revokeRulesOnDelete: true,
        vpcId: vpc.id,
        // rules defined below
      },
      { parent: this }
    );

    this.loadBalancerSecurityGroup = new aws.ec2.SecurityGroup(
      `${name}-sg-lb`,
      {
        description: "security group for load balancer",
        revokeRulesOnDelete: true,
        vpcId: vpc.id,
        ingress: [
          {
            fromPort: wellKnown.https,
            toPort: wellKnown.https,
            description: "Load balancer handles inbound http/s connections",
            protocol: "tcp",
            ipv6CidrBlocks: ["::/0"],
          },
          {
            fromPort: wellKnown.http,
            toPort: wellKnown.http,
            description: "Load balancer handles inbound http/s connections",
            protocol: "tcp",
            ipv6CidrBlocks: ["::/0"],
          },
          {
            fromPort: wellKnown.https,
            toPort: wellKnown.https,
            description: "Load balancer handles inbound http/s connections",
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
          },
          {
            fromPort: wellKnown.http,
            toPort: wellKnown.http,
            description: "Load balancers handles inbound http/s connections",
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
          },
        ],
        egress: [
          {
            fromPort: wellKnown.https,
            toPort: wellKnown.https,
            description: "Load balancer allow https outbound",
            protocol: "tcp",
            securityGroups: [this.webSecurityGroup.id],
          },
          {
            fromPort: wellKnown.http,
            toPort: wellKnown.http,
            description: "Load balancer allow http outbound",
            protocol: "tcp",
            securityGroups: [this.webSecurityGroup.id],
          },
        ],
      },
      { parent: this }
    );

    [wellKnown.http, wellKnown.https].forEach(
        (port) =>
            new aws.ec2.SecurityGroupRule(
                `${name}-${port}`,
                {
                    securityGroupId: this.webSecurityGroup.id,
                    type: 'ingress',
                    fromPort: port,
                    toPort: port,
                    description:
                        `Allow inbound ${port} from load balancer`,
                    protocol: 'tcp',
                    sourceSecurityGroupId: this.loadBalancerSecurityGroup.id,
                },
                { parent: this },
            ))
  }
}
