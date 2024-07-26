import exp from 'constants';
import { version } from 'os';
import { z } from 'zod';


  export const appSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
      name: z.string(),
      bundleId: z.string(),
      sku: z.string(),
      primaryLocale: z.string(),
      isOrEverWasMadeForKids: z.boolean(),
      subscriptionStatusUrl: z.string().nullable(),
      subscriptionStatusUrlVersion: z.string().nullable(),
      subscriptionStatusUrlForSandbox: z.string().nullable(),
      subscriptionStatusUrlVersionForSandbox: z.string().nullable(),
      contentRightsDeclaration: z.string().nullable(),
    }),
  });
export const appSchemas = z.array(appSchema);
export type App = z.infer<typeof appSchema>;


const iconAssetTokenSchema = z.object({
  templateUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const attributesSchema = z.object({
  version: z.string(),
  uploadedDate: z.string(),
  expirationDate: z.string(),
  expired: z.boolean(),
  minOsVersion: z.string(),
  lsMinimumSystemVersion: z.string().nullable(),
  computedMinMacOsVersion: z.string().nullable(),
  computedMinVisionOsVersion: z.string().nullable(),
  iconAssetToken: iconAssetTokenSchema,
  processingState: z.enum(['PROCESSING', 'FAILED', 'INVALID', 'VALID']), 
  buildAudienceType: z.enum(['APP_STORE_ELIGIBLE',
    'APP_STORE_ELIGIBLE_FOR_MAC_APP_STORE'
  ]),
  usesNonExemptEncryption: z.boolean().nullable(),
});


export const buildSchema = z.object({
  type: z.literal('builds'),
  id: z.string().uuid(),
  attributes: attributesSchema,
});
export const buildSchemas = z.array(buildSchema);

export const buildSchemaWithBetaGroups = z.object({
  type: z.literal('builds'),
  id: z.string().uuid(),
  attributes: z.object({
    version: z.string(),
    uploadedDate: z.string(),
    expirationDate: z.string(),
    expired: z.boolean(),
    iconAssetToken: z.object({
      templateUrl: z.string().url(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    processingState: z.enum(['PROCESSING', 'FAILED', 'INVALID', 'VALID']), 
    buildAudienceType: z.enum(['APP_STORE_ELIGIBLE',
      'APP_STORE_ELIGIBLE_FOR_MAC_APP_STORE'
    ]),
  }),
  relationships: z.object({
    betaGroups: z.object({
      data: z.array(z.object({
        type: z.string(),
        id: z.string(),
      }))
    })
  })
});
export const buildSchemasWithBetaGroups = z.array(buildSchemaWithBetaGroups);

export const betaGroupSchema = z.object({
  type: z.literal('betaGroups'),
  id: z.string().uuid(),
  attributes: z.object({
    name: z.string(),
    createdDate: z.string(),
    isInternalGroup: z.boolean(),
    hasAccessToAllBuilds: z.boolean().nullable(),
    publicLinkEnabled: z.boolean().nullable(),
    publicLinkId: z.string().nullable(),
    publicLinkLimitEnabled: z.boolean().nullable(),
    publicLinkLimit: z.number().nullable(),
    publicLink: z.string().nullable(),
    feedbackEnabled: z.boolean(),
    iosBuildsAvailableForAppleSiliconMac: z.boolean(),
    iosBuildsAvailableForAppleVision: z.boolean(),
  }),
});

export const betaGroupsSchema = z.array(betaGroupSchema);

export type BetaGroup = z.infer<typeof betaGroupSchema>;

export type Build = z.infer<typeof buildSchema>;

export type AppWithIcon = App & { icon: string };

export const appStoreVersionSchema = z.object({
  type: z.literal('appStoreVersions'),
  id: z.string().uuid(),
  attributes: z.object({
    platform: z.string(),
    versionString: z.string(),
    appStoreState: z.enum(['ACCEPTED', 'DEVELOPER_REJECTED', 'IN_REVIEW', 'INVALID_BINARY', 'METADATA_REJECTED', 'PENDING_APPLE_RELEASE', 'PENDING_DEVELOPER_RELEASE', 'PREPARE_FOR_SUBMISSION', 'PROCESSING_FOR_DISTRIBUTION', 'READY_FOR_DISTRIBUTION', 'READY_FOR_REVIEW', 'READY_FOR_SALE','REJECTED', 'REPLACED_WITH_NEW_VERSION', 'WAITING_FOR_EXPORT_COMPLIANCE', 'WAITING_FOR_REVIEW']),
    appVersionState: z.enum(['ACCEPTED', 'DEVELOPER_REJECTED', 'IN_REVIEW', 'INVALID_BINARY', 'METADATA_REJECTED', 'PENDING_APPLE_RELEASE', 'PENDING_DEVELOPER_RELEASE', 'PREPARE_FOR_SUBMISSION', 'PROCESSING_FOR_DISTRIBUTION', 'READY_FOR_DISTRIBUTION', 'READY_FOR_REVIEW', 'REJECTED', 'REPLACED_WITH_NEW_VERSION', 'WAITING_FOR_EXPORT_COMPLIANCE', 'WAITING_FOR_REVIEW']),
    copyright: z.string().nullable(),
    reviewType: z.string().nullable(),
    releaseType: z.string().nullable(),
    earliestReleaseDate: z.string().nullable(),
    usesIdfa: z.boolean().nullable(),
    downloadable: z.boolean(),
    createdDate: z.string(),
  }),
});

export const preReleaseVersionSchema = z.object({
  id: z.string().uuid(),
  attributes: z.object({
    platform: z.string(),
    version: z.string()
  }),
});

export const betaBuildLocalizationSchema = z.object({
  type: z.literal('betaBuildLocalizations'),
  id: z.string().uuid(),
  attributes: z.object({
    whatsNew: z.string().nullable(),
    locale: z.string(),
  }),
});

export const buildBetaDetailSchema = z.object({
  type: z.literal('buildBetaDetails'),
  id: z.string().uuid(),
  attributes: z.object({
    internalBuildState: z.enum(['PROCESSING', 'PROCESSING_EXCEPTION', 'MISSING_EXPORT_COMPLIANCE', 'READY_FOR_BETA_TESTING', 'IN_BETA_TESTING', 'EXPIRED', 'IN_EXPORT_COMPLIANCE_REVIEW']).optional(),
    externalBuildState: z.enum(['PROCESSING', 'PROCESSING_EXCEPTION', 'MISSING_EXPORT_COMPLIANCE', 'READY_FOR_BETA_TESTING', 'IN_BETA_TESTING', 'EXPIRED', 'READY_FOR_BETA_SUBMISSION', 'IN_EXPORT_COMPLIANCE_REVIEW', 'WAITING_FOR_BETA_REVIEW', 'IN_BETA_REVIEW', 'BETA_REJECTED', 'BETA_APPROVED']).optional(),
  }),
});


export const buildWithBetaDetailAndBetaGroupsScehma = z.object({
  build: buildSchemaWithBetaGroups,
  buildBetaDetails: buildBetaDetailSchema,
  betaGroups: z.array(betaGroupSchema),
});

export type BuildWithBetaDetailAndBetaGroups = z.infer<typeof buildWithBetaDetailAndBetaGroupsScehma>;

const apiResponseSchema = z.object({
  data: z.array(buildSchemaWithBetaGroups),
  included: z.array(z.union([buildBetaDetailSchema, z.unknown()])),
});


export const buildsWithBetaDetailSchema = apiResponseSchema.transform((response) => {
  return response.data.map((build) => {
    return {
      build: build,
      buildBetaDetails: response.included.find((item: any) => item.type === "buildBetaDetails" && item.id === build.id),
      betaGroups: response.included.filter((item: any) => {
        return item.type === "betaGroups" && build.relationships.betaGroups.data.find((bg: any) => bg.id === item.id);
      }),
    } as BuildWithBetaDetailAndBetaGroups;
  });
});

export const betaBuildUsageSchema = z.object({
  type: z.literal('betaBuildUsages'),
  dataPoints: z.array(z.object({
    start: z.string(),
    end: z.string(),
    values: z.object({
      installCount: z.number(),
      crashCount: z.number(),
      sessionCount: z.number(),
      inviteCount: z.number(),
      feedbackCount: z.number(),
    })
  }))
});

export const betaBuildUsagesSchema = z.array(betaBuildUsageSchema);

export type BetaBuildUsage = z.infer<typeof betaBuildUsageSchema>;

export type BuildsWithBetaDetailAndBetaGroups = z.infer<typeof buildsWithBetaDetailSchema>;

export const betaBuildLocalizationsSchema = z.array(betaBuildLocalizationSchema);

export type BetaBuildLocalization = z.infer<typeof betaBuildLocalizationSchema>;

export const appStoreVersionSchemas = z.array(appStoreVersionSchema);

export const preReleaseVersionSchemas = z.array(preReleaseVersionSchema);

export type AppStoreVersion = z.infer<typeof appStoreVersionSchema>;

export type PreReleaseVersion = z.infer<typeof preReleaseVersionSchema>;