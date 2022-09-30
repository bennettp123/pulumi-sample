import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class LoadBalancer extends pulumi.ComponentResource {
  targetGroupArn: pulumi.Output<string>;

  /**
   * The URL for connecting to the load balancer.
   * Format: <protocol>://<hostname> where <protocol> is either 'http' or
   * 'https' and '<hostname>' is the public hostname of the load balancer.
   */
  url: pulumi.Output<string>;
  
  route53alias: {
    name: pulumi.Output<string>;
    zoneId: pulumi.Output<string>;
    evaluateTargetHealth: pulumi.Output<boolean>;
  };

  constructor(
    name: string,
    args: {
      vpcId: pulumi.Input<string>;
      subnetIds: pulumi.Input<string[]>;
      securityGroups: pulumi.Input<string>[];
      certificateArn?: pulumi.Input<string>;
    },
    opts: pulumi.ComponentResourceOptions
  ) {
    super("swm:alb", name, args, opts);

    const alb = new aws.lb.LoadBalancer(
      name,
      {
        loadBalancerType: "application",
        securityGroups: args.securityGroups,
        subnets: args.subnetIds,
        ipAddressType: "dualstack",

        // idleTimeout controls how long HTTP keepalives are kept open.
        // Should be less than the idleTimeout of the backend servers.
        idleTimeout: 15, // seconds
      },
      { parent: this }
    );

    this.url = pulumi
      .all([args.certificateArn, alb.dnsName])
      .apply(
        ([certificateArn, albdnsName]) =>
          `${certificateArn ? "https" : "http"}://${albdnsName}`
      );

    const targetGroup = new aws.lb.TargetGroup(
      `${name}-tg`,
      {
        port: 443,
        protocol: "HTTP",
        targetType: "ip",
        ipAddressType: "ipv6",
        vpcId: args.vpcId,
        // Reduce deregistration delay to make deployments faster
        deregistrationDelay: 30,

        healthCheck: {
          protocol: "HTTP",
          path: "/health-check",
          timeout: 5,
          // Default is 30 seconds, to be considered healthy we need 5 passing health checks (2.5mins)
          // it will now be 20 seconds with only 2 passing health checks needed
          interval: 10,
          // Wait 60 seconds before deciding a host is unhealthy
          unhealthyThreshold: 6,
          // But once a instance has said it's healthy for 10 seconds, assume healthy
          healthyThreshold: 2,
        },
      },
      { parent: this }
    );

    // an HTTPS listener requires exactly one certificate
    if (args.certificateArn) {
      new aws.lb.Listener(
        `${name}-https`,
        {
          loadBalancerArn: alb.arn,
          certificateArn: args.certificateArn,
          protocol: "HTTPS",
          port: 443,
          sslPolicy: "ELBSecurityPolicy-FS-1-2-Res-2019-08",
          defaultActions: [
            {
              type: "forward",
              targetGroupArn: targetGroup.arn,
            },
          ],
        },
        { parent: this }
      );
    } else {
      new aws.lb.Listener(
        `${name}-http`,
        {
          loadBalancerArn: alb.arn,
          protocol: "HTTP",
          port: 80,
          defaultActions: args.certificateArn
            ? [
                {
                  type: "redirect",
                  redirect: {
                    protocol: "HTTPS",
                    port: "443",
                    statusCode: "HTTP_301",
                  },
                },
              ]
            : [{ type: "forward", targetGroupArn: targetGroup.arn }],
        },
        { parent: this }
      );
    }

    this.targetGroupArn = targetGroup.arn;
    this.route53alias = {
      name: alb.dnsName,
      zoneId: alb.zoneId,
      evaluateTargetHealth: pulumi.output(false),
    };
  }
}
