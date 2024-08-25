import { Form, ActionPanel, Action, Color, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { App, Build, AppStoreVersion, appSchemas, BuildWithBetaDetailAndBetaGroups, appStoreVersionSchemas, buildsWithBetaDetailSchema, PreReleaseVersion, preReleaseVersionSchemas, BetaGroup } from "../Model/schemas";
import BuildItem from "./BuildItem";
import { presentError } from "../Utils/utils";


interface VersionWithPlatform {
    id: string;
    platform: string;
    version: string;
}

interface Props {
    app: App;
    group: BetaGroup;
    didAddBuilds: (builds: BuildWithBetaDetailAndBetaGroups[]) => void;
    didRemoveBuilds: (builds: BuildWithBetaDetailAndBetaGroups[]) => void;
}

export default function ManageInternalBuilds({ app, group, didAddBuilds, didRemoveBuilds }: Props) {
    const [selectedVersion, setSelectedVersion] = useState<string | undefined>(undefined);

    const [buildsPath, setBuildsPath] = useState<string | undefined>(undefined);
    const [currentBuildsPath, setCurrentBuildsPath] = useState<string | undefined>(undefined);

    const { data: builds, isLoading: isLoadingApp, error: errorApp } = useAppStoreConnectApi(buildsPath, (response: any) => {
        console.log("response", response);
        return buildsWithBetaDetailSchema.parse(response);
    });
    const { data: currentBuilds, isLoading: isLoadingCurrentBuilds, error: errorCurrentBuilds } = useAppStoreConnectApi(currentBuildsPath, (response: any) => {
        return buildsWithBetaDetailSchema.parse(response);
    });

    const { data: preReleaseVersions, isLoading: isLoadingPreReleaseVersions } = useAppStoreConnectApi(`/preReleaseVersions?filter[app]=${app.id}&sort=-version&fields[preReleaseVersions]=builds,version,platform&limit=5`, (response) => {
        return preReleaseVersionSchemas.safeParse(response.data).data ?? null;
    });

    console.log("preReleaseVersions", preReleaseVersions);

    const [versions, setVersions] = useState<VersionWithPlatform[] | undefined>(undefined);
    
    const [buildIDs, setBuildIDs] = useState<string[] | undefined>(undefined);

    const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (preReleaseVersions !== null) {
            const versions = preReleaseVersions.map((appStoreVersion) => {
                return {
                    id: appStoreVersion.id,
                    platform: appStoreVersion.attributes.platform,
                    version: appStoreVersion.attributes.version
                } as VersionWithPlatform;
            });
            setVersions(versions);
        }
    }, [preReleaseVersions]);

    useEffect(() => {
      if (selectedVersion !== undefined ) {
        const selected = versions?.find((version) => version.id === selectedVersion);
        if (!selected) {
            return;
        }
        setBuildsPath(`/builds?filter[preReleaseVersion.platform]=${selected.platform}&filter[preReleaseVersion.version]=${selected.version}&filter[app]=${app.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`)
        setCurrentBuildsPath(`/builds?filter[preReleaseVersion.platform]=${selected.platform}&filter[preReleaseVersion.version]=${selected.version}&filter[app]=${app.id}&filter[betaGroups]=${group.id}&sort=-uploadedDate&fields[builds]=processingState,iconAssetToken,uploadedDate,version,betaGroups,buildAudienceType,expirationDate,expired,buildBetaDetail&limit=5&include=buildBetaDetail,betaGroups&fields[buildBetaDetails]=externalBuildState,internalBuildState`)
      }
    }, [selectedVersion])

    useEffect(() => {
        if (currentBuilds) {
            setBuildIDs(currentBuilds.map((build) => build.build.id));
        }
    }, [currentBuilds]);

    const platformWithVersion = (appStoreVersion: VersionWithPlatform | undefined) => {
        if (!appStoreVersion) {
            return "";
        }
        switch (appStoreVersion.platform) {
            case "IOS":
                return "iOS " + appStoreVersion.version;
            case "MAC_OS":
                return "macOS " + appStoreVersion.version;
            case "TV_OS":
                return "tvOS " + appStoreVersion.version;
            case "VISION_OS":
                return "visionOS " + appStoreVersion.version;
            default:
                return appStoreVersion.platform + " " + appStoreVersion.version;
        }
    }

    return (
        <Form 
            isLoading={isLoadingApp || isLoadingPreReleaseVersions || isLoadingCurrentBuilds || submitIsLoading}
            actions={
                <ActionPanel>
                    <Action.SubmitForm 
                        title="Update build" 
                        onSubmit={(values: { builds: string[] }) => {
                            setSubmitIsLoading(true);
                            (async () => {
                                try {
                                const removed = currentBuilds?.filter((build) => !values.builds.includes(build.build.id));
                                const added = values.builds.filter((build) => !currentBuilds?.find((currentBuild) => currentBuild.build.id === build));
                                if (removed && removed.length > 0) {                                    
                                    for (const build of removed) {
                                        await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds `, "DELETE", {
                                            data: [{
                                                type: "builds",
                                                id: build.build.id
                                            }]
                                        });
                                    }
                                }
                                if (added && added.length > 0) {
                                    for (const build of added) {
                                        await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds `, "POST", {
                                            data: [{
                                                type: "builds",
                                                id: build
                                            }]
                                        });
                                    }
                                }
                                setSubmitIsLoading(false);
                                showToast({
                                    style: Toast.Style.Success,
                                    title: "Success!",
                                    message: "Updated",
                                });
                                if (removed && removed.length > 0) {
                                    didRemoveBuilds(removed);
                                }
                                if (builds && added && added.length > 0) {
                                    didAddBuilds(builds.filter((build) => added.includes(build.build.id)));
                                }
                                
                            } catch (error) {
                                setSubmitIsLoading(false);
                                presentError(error);
                            }
                            })();
                        }
                    }
                    />
                </ActionPanel>
            }   
        >
            <Form.Dropdown
                id="version"
                title="Select a version"
                value={selectedVersion}
                onChange={(version) => {
                    setSelectedVersion(version)}

                }>
                    {versions?.map((version) => (
                        <Form.Dropdown.Item
                            key={version.id}
                            title={platformWithVersion(version)}
                            value={version.id}
                        />
                    ))}
            </Form.Dropdown>
            <Form.TagPicker
                id="builds"
                title="Select a build"
                value={buildIDs}
                onChange={(buildIDs) => {
                    setBuildIDs(buildIDs);
                }}
            >
            {builds?.map((build) => (
                <Form.TagPicker.Item
                    key={build.build.id}
                    title={"Build " + build.build.attributes.version}
                    value={build.build.id}
                />
            ))}
            </Form.TagPicker>
        </Form>
    )
};