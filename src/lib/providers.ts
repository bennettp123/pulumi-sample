import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const providers: {
  [region: string]: pulumi.ProviderResource;
} = {};

for (const region of [aws.Region.APSoutheast2, aws.Region.USEast1]) {
  providers[region] = new aws.Provider(region, {
    region,
  });
}
