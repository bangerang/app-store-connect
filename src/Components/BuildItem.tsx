
import { List, ActionPanel, Action, Image, Icon, Color } from "@raycast/api";
import { App, BuildWithBetaDetailAndBetaGroups, BetaGroup, betaBuildUsagesSchema } from "../Model/schemas";
import BuildDetail from "./BuildDetail";
import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import IndividualTestersList from "./IndividualTestersList";
import { presentError } from "../Utils/utils";

interface BuildItemProps {
    app: App;
    build: BuildWithBetaDetailAndBetaGroups;
}
export default function BuildItem({ build, app }: BuildItemProps) {
    const [betaGroups, setBetaGroups] = useState<BetaGroup[]>([])
    const [externalBuildState, setExternalBuildState] = useState<string | undefined>("");

    const {data: betaBuildUsages } = useAppStoreConnectApi(`/builds/${build.build.id}/metrics/betaBuildUsages`, (response) => {
        return betaBuildUsagesSchema.safeParse(response.data).data ?? null;
    });

    useEffect(() => {
        setBetaGroups(build.betaGroups);
        setExternalBuildState(build.buildBetaDetails.attributes.externalBuildState);
    }, [build]);

    const firstBetaBuildUsage = betaBuildUsages?.[0];

    const getProcessingStatus = (item: BuildWithBetaDetailAndBetaGroups) => {
        const betaDetails = item.buildBetaDetails;
        if (!betaDetails) {
            return "Unknown";
        }
        if (betaDetails.attributes.externalBuildState === "PROCESSING") {
            return "Processing";
        } else if (betaDetails.attributes.externalBuildState === "PROCESSING_EXCEPTION") {
            return "Processing Exception";
        } else if (betaDetails.attributes.externalBuildState === "MISSING_EXPORT_COMPLIANCE") {
            return "Missing Export Compliance";
        } else if (betaDetails.attributes.externalBuildState === "READY_FOR_BETA_TESTING") {
            return "Ready for Beta Testing";
        } else if (betaDetails.attributes.externalBuildState === "IN_BETA_TESTING") {
            return "Testing";
        } else if (betaDetails.attributes.externalBuildState === "EXPIRED") {
            return "Expired";
        } else if (betaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION") {
            return "Ready to Submit";
        } else if (betaDetails.attributes.externalBuildState === "IN_EXPORT_COMPLIANCE_REVIEW") {
            return "In Export Compliance Review";
        } else if (betaDetails.attributes.externalBuildState === "WAITING_FOR_BETA_REVIEW") {
            return "Waiting for Beta Review";
        } else if (betaDetails.attributes.externalBuildState === "IN_BETA_REVIEW") {
            return "In Beta Review";
        } else if (betaDetails.attributes.externalBuildState === "BETA_REJECTED") {
            return "Beta Rejected";
        } else if (betaDetails.attributes.externalBuildState === "BETA_APPROVED") {
            return "Approved";
        } else {
            console.log(betaDetails.attributes.internalBuildState);
            return "Unknown";
        }
    }

    const getProccessingStatusIcon = (item: BuildWithBetaDetailAndBetaGroups) => {
        const betaDetails = item.buildBetaDetails;
        if (!betaDetails) {
            return Icon.Dot;
        }
        if (betaDetails.attributes.externalBuildState === "PROCESSING") {
            return Icon.Dot;
        } else if (betaDetails.attributes.externalBuildState === "PROCESSING_EXCEPTION") {
            return { source: Icon.Dot, tintColor: Color.Red };
        } else if (betaDetails.attributes.externalBuildState === "MISSING_EXPORT_COMPLIANCE") {
            return { source: Icon.Warning, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "READY_FOR_BETA_TESTING") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "IN_BETA_TESTING") {
            return { source: Icon.Dot, tintColor: Color.Green };
        } else if (betaDetails.attributes.externalBuildState === "EXPIRED") {
            return { source: Icon.Dot, tintColor: Color.Red };
        } else if (betaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "IN_EXPORT_COMPLIANCE_REVIEW") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "WAITING_FOR_BETA_REVIEW") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "IN_BETA_REVIEW") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "BETA_REJECTED") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else if (betaDetails.attributes.externalBuildState === "BETA_APPROVED") {
            return { source: Icon.Dot, tintColor: Color.Yellow };
        } else {
            return Icon.Dot;
        }
    }

    const accessoriesForBuild = () => {
        const item = build;
        const getProcessingStatusArray = [
            { text: getProcessingStatus(item), icon: getProccessingStatusIcon(item) },
        ]
        const betaGroupsCommaSeparated = betaGroups.map((bg) => {
            return bg.attributes.name
        });
        const betaGroupsShortCommaSeparated = betaGroupsCommaSeparated.map((bg) => {
            const name = bg.substring(0, 2).toUpperCase();
            return name
        });
        const betaGroupsCommaSeparatedString = betaGroupsShortCommaSeparated.join(", ");
        const betaGroupsAccessory = { text: betaGroupsCommaSeparatedString, icon: { source: Icon.TwoPeople, tintColor: Color.Blue }, tooltip: "Beta Groups: " + betaGroupsCommaSeparated.join(", ") } as any;

        let usage: any[] = [];
        if (firstBetaBuildUsage !== undefined) {
            const dataPoints = firstBetaBuildUsage.dataPoints
            if (dataPoints.length > 0) {
                const dataPoint = dataPoints[0];
                const hyphenIfZero = (value: number) => {
                    if (value === 0) {
                        return "-";
                    } else {
                        return value.toString();
                    }
                }
                usage = [
                    { text: hyphenIfZero(dataPoint.values.inviteCount), tooltip: "Invites", icon: { source: Icon.Envelope, tintColor: Color.Yellow } },
                    { text: hyphenIfZero(dataPoint.values.installCount), tooltip: "Installs", icon: { source: Icon.ArrowDown, tintColor: Color.Green } },
                    { text: hyphenIfZero(dataPoint.values.sessionCount), tooltip: "Sessions", icon: { source: Icon.Mobile, tintColor: Color.Green } },
                    { text: hyphenIfZero(dataPoint.values.crashCount), tooltip: "Crashes", icon: { source: Icon.Exclamationmark, tintColor: Color.Red } },
                ] as any;
            }
        } else {
            usage = [
                { text: "-", tooltip: "Invites", icon: { source: Icon.Envelope, tintColor: Color.Yellow } },
                { text: "-", tooltip: "Installs", icon: { source: Icon.ArrowDown, tintColor: Color.Green } },
                { text: "-", tooltip: "Sessions", icon: { source: Icon.Mobile, tintColor: Color.Green } },
                { text: "-", tooltip: "Crashes", icon: { source: Icon.Exclamationmark, tintColor: Color.Red } },
            ] as any;
        }

        if (item.betaGroups.length === 0) {
            return usage.concat(getProcessingStatusArray);
        } else {
            return [betaGroupsAccessory].concat(usage).concat(getProcessingStatusArray);
        }
    }


    const convertExpirationDateToDays = () => {
        const b = build.build;
        const expirationDate = new Date(b.attributes.expirationDate);
        const currentDate = new Date();
        const days = Math.round(Math.abs((expirationDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)));
        if (b.attributes.expired) {
            return undefined;
        } else if (days === 0) {
            return "Expires Today";
        } else if (days === 1) {
            return "Expires in 1 day";
        } else {
            return "Expires in " + days.toString() + " days";
        }
    }

    const canInviteTesters = () => {
        const betaDetails = build.buildBetaDetails;
        if (!betaDetails) {
            return false;
        }
        if (betaDetails.attributes.externalBuildState === "EXPIRED") {
            return false;
        } else if (betaDetails.attributes.externalBuildState === "PROCESSING_EXCEPTION") {
            return false;
        } else if (isMissingExportCompliance()) {
            return false;
        } else if (build.build.attributes.processingState === "PROCESSING") {
            return false;
        }
        return true;
    }
    
    const iconURL = useMemo(() => {
        if (build.build.attributes.iconAssetToken?.templateUrl) {
            const { templateUrl, width, height } = build.build.attributes.iconAssetToken;
            const url = `${templateUrl
                .replace('{w}', width.toString())
                .replace('{h}', height.toString())
                .replace('{f}', 'png')}`;
            return url;
        } else {
            return "";
        }
      }, [build]);

    const isMissingExportCompliance = () => {
        return build.buildBetaDetails.attributes.externalBuildState === "MISSING_EXPORT_COMPLIANCE";
    }

    const setExportCompliance = async (encryption: boolean) => {
        const response = await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
            data: {
                type: "builds",
                id: build.build.id,
                attributes: {
                    usesNonExemptEncryption: encryption
                }
            }
        });
    };
    const isExpired = () => {
        return build.buildBetaDetails.attributes.externalBuildState === "EXPIRED" || build.buildBetaDetails.attributes.internalBuildState === "EXPIRED";
    }

    const expireBuild = async () => {
        const response = await fetchAppStoreConnect(`/builds/${build.build.id}`, "PATCH", {
            data: {
                type: "builds",
                id: build.build.id,
                attributes: {
                    expired: true
                }
            }
        });
    };

    return (
        <List.Item
            id={build.build.id}
            icon={{ 
                source: iconURL,
                mask: Image.Mask.RoundedRectangle, }}
            title={"Build " + build.build.attributes.version + (build.build.attributes.processingState === "PROCESSING" ? " (Processing)" : "")}
            subtitle={convertExpirationDateToDays()}
            accessories={accessoriesForBuild()}
            actions={
            <ActionPanel>
                {canInviteTesters() && <>
                <Action.Push title="Manage Beta Groups" target={<BuildDetail 
                                                                    build={build} 
                                                                    app={app} 
                                                                    groupsDidChange={(groups: BetaGroup[]) => {
                                                                        build.betaGroups = groups;
                                                                        setBetaGroups(groups);
                                                                    }}
                                                                    betaStateDidChange={(betaState: string) => {
                                                                        build.buildBetaDetails.attributes.externalBuildState = betaState
                                                                        setExternalBuildState(betaState)
                                                                    }}
                                                                    />
                                                                } 
                                                                />
                <Action.Push title="Manage Individual Testers" target={<IndividualTestersList app={app} build={build} />} />
                </>
            }
            {isMissingExportCompliance() && <Action title="Set is not using non-exempt encryption" onAction={async () => {
                const oldState = build.buildBetaDetails.attributes.externalBuildState;
                (async () => {
                    try {
                        build.buildBetaDetails.attributes.externalBuildState = "READY_FOR_BETA_SUBMISSION";
                        setExternalBuildState("READY_FOR_BETA_SUBMISSION");
                        await setExportCompliance(false);
                    } catch (error) {
                        presentError(error);
                        build.buildBetaDetails.attributes.externalBuildState = oldState;
                        setExternalBuildState(oldState);
                    }
                })();
            }}/>}
            {isMissingExportCompliance() && <Action title="Set is using non-exempt encryption" onAction={async () => {
                const oldState = build.buildBetaDetails.attributes.externalBuildState;
                (async () => {
                    try {
                        build.buildBetaDetails.attributes.externalBuildState = "READY_FOR_BETA_SUBMISSION";
                        setExternalBuildState("READY_FOR_BETA_SUBMISSION");
                        await setExportCompliance(true);
                    } catch (error) {
                        presentError(error);
                        build.buildBetaDetails.attributes.externalBuildState = oldState;
                        setExternalBuildState(oldState);
                    }
                })();
            }} />}
            {!isExpired() && <Action title="Expire" onAction={async () => {
                        const oldState = build.buildBetaDetails.attributes.externalBuildState;
                        (async () => {
                            try {
                                build.buildBetaDetails.attributes.externalBuildState = "EXPIRED";
                                setExternalBuildState("EXPIRED");
                                await expireBuild();
                            } catch (error) {
                                presentError(error);
                                build.buildBetaDetails.attributes.externalBuildState = oldState;
                                setExternalBuildState(oldState);
                            }
                        })();
                    }} />}
            </ActionPanel>
            }  
      />
    );
}