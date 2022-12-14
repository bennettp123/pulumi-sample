import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export class Cdn extends pulumi.ComponentResource {
  static defaultOriginId = 'default'

  url: pulumi.Output<string>

  constructor(
    name: string,
    args: {
      /**
       * The URL of the origin server. Use http://<hostname> to force
       * http to the origin, or https://<hostname> to force https.
       */
      originUrl: pulumi.Input<string>
      certificateArn?: pulumi.Input<string>
    },
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('swm-sample:lib/cdn/Cdn', name, {}, opts)

    const originProtocol = pulumi
      .output(args.originUrl)
      .apply((originUrl) => new URL(originUrl).protocol.replace(/:$/, ''))

    const originDomainName = pulumi
      .output(args.originUrl)
      .apply((originUrl) => new URL(originUrl).hostname)

    const cachePolicyId = aws.cloudfront
      .getCachePolicy({
        name: 'Managed-CachingOptimized',
      })
      .then(
        (result) =>
          result.id ??
          (() => {
            throw new pulumi.ResourceError(
              'unable to determine cache policy ID',
              this,
            )
          })(),
      )

    const originProtocolPolicy = originProtocol.apply((protocol) =>
      protocol === 'https'
        ? 'https-only'
        : protocol === 'http'
        ? 'http-only'
        : (() => {
            pulumi.log.warn(
              `unrecognised originUrl protocol ${protocol}; using "match-viewer"`,
            )
            return 'match-viewer'
          })(),
    )
    const distribution = new aws.cloudfront.Distribution(
      `${name}-cdn`,
      {
        enabled: true,
        isIpv6Enabled: true,
        httpVersion: 'http2and3',
        priceClass: 'PriceClass_All',
        defaultCacheBehavior: {
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachePolicyId,
          compress: true,
          targetOriginId: Cdn.defaultOriginId,
          viewerProtocolPolicy: 'redirect-to-https',
        },
        origins: [
          {
            originId: Cdn.defaultOriginId,
            domainName: originDomainName,
            connectionAttempts: 3,
            connectionTimeout: 10,
            customOriginConfig: {
              httpPort: 80,
              httpsPort: 443,
              originKeepaliveTimeout: 5,
              originReadTimeout: 30,
              originProtocolPolicy,
              originSslProtocols: ['TLSv1.2'],
            },
          },
        ],
        viewerCertificate: args.certificateArn
          ? {
              acmCertificateArn: args.certificateArn,
              minimumProtocolVersion: 'TLSv1.2_2019',
              sslSupportMethod: 'sni-only',
            }
          : {
              cloudfrontDefaultCertificate: true,
            },
        restrictions: {
          geoRestriction: {
            restrictionType: 'none',
          },
        },
      },
      { parent: this },
    )

    this.url = pulumi.interpolate`https://${distribution.domainName}`
  }
}
