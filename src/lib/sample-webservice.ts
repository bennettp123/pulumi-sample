import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

export class WebService extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: {
      clusterArn: pulumi.Input<string>;
      subnetIds: pulumi.Input<string[]>;
      securityGroupIds: pulumi.Input<string>[];
      targetGroupArn: pulumi.Input<string>;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("swm-sample:lib/sample-webservice/WebService", name, {}, opts);

    const containerName = `${name}-sample-webservice`;

    const taskExecutionRole = new aws.iam.Role(
      `${name}-ecsTaskExecutionRole`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
          aws.iam.Principals.EcsTasksPrincipal
        ),
        managedPolicyArns: [
          aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
        ],
      },
      { parent: this }
    );

    const task = new aws.ecs.TaskDefinition(
      `${name}-sample-webservice`,
      {
        containerDefinitions: JSON.stringify([
          {
            name: containerName,
            image: "httpd:2.4",
            command: `"/bin/sh -c \"echo '<html><head><title>Sample webservice</title><style>body {margin-top: 40px; background-color: #333;}</style></head><body><div style=color:white;text-align:center><h1>Sample Webserver</h1><h2>It works!</h2></div></body></html>' >  /usr/local/apache2/htdocs/index.html && httpd-foreground\""`,
            essential: true,
            stopTimeout: 10,
            portMappings: [
              {
                containerPort: 80,
              },
            ],
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": `/ecs/sample-app/${name}`,
                "awslogs-region": "ap-southeast-2",
                "awslogs-stream-prefix": "ecs",
              },
            },
          },
        ]),
        family: `${name}-sample-webservice`,
        cpu: "256",
        memory: "1024",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: taskExecutionRole.arn,
      },
      { parent: this }
    );

    new aws.ecs.Service(
      `${name}-sample-webservice`,
      {
        cluster: args.clusterArn,
        taskDefinition: task.arn,
        deploymentController: {
          type: "ECS",
        },
        deploymentCircuitBreaker: {
          enable: true,
          rollback: true,
        },
        capacityProviderStrategies: [
          {
            capacityProvider: "FARGATE_SPOT",
            weight: 100,
          },
        ],
        desiredCount: 2,
        loadBalancers: [
          {
            containerName,
            containerPort: 80,
            targetGroupArn: args.targetGroupArn,
          },
        ],
        networkConfiguration: {
          subnets: args.subnetIds,
          securityGroups: args.securityGroupIds,
        },
      },
      { parent: this }
    );
  }
}
