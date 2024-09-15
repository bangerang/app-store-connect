import { List, Icon, confirmAlert, Alert, ActionPanel, Action, Color } from "@raycast/api";
import { BetaGroup, betaTestersSchema, BetaTester, App, betaTesterUsageSchemas } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { useEffect, useState } from "react";
import InternalBetaGroupTesters from "./InternalBetaGroupTesters";
import ExternalBetaGroupTesters from "./ExternalBetaGroupTesters";
import AddExternalBetaTester from "./AddExternalBetaTester";
import ManageInternalBuilds from "./ManageInternalBuilds";
interface Props {
    app: App;
    group: BetaGroup;
}
export default function BetaGroupDetail({ app, group }: Props) {
    const { data, isLoading: isLoadingBetaGroup, pagination } = useAppStoreConnectApi(`/betaTesters?filter[betaGroups]=${group.id}`, (response) => {
        return betaTestersSchema.safeParse(response.data).data ?? null;
    });
    const [testers, setTesters] = useState<BetaTester[]>([]);
    const { data: betaTesterUsages, isLoading: isLoadingBetaTesterUsages } = useAppStoreConnectApi(`/betaGroups/${group.id}/metrics/betaTesterUsages?groupBy=betaTesters`, (response) => {
        return betaTesterUsageSchemas.safeParse(response.data).data ?? null;
    }, true);


    useEffect(() => {
        if (data && betaTesterUsages) {
            setTesters(data);
        }
    }, [data, betaTesterUsages]);

    const getBetaTesterUsage = (betaTester: BetaTester) => {
        const usage = betaTesterUsages?.find((usage) => usage.dimensions.betaTesters.data.id === betaTester.id);
        if (usage) {
            return usage.dataPoints[0];
        } else {
            return undefined;
        }
    }

    const textForState = (betaTester: BetaTester): string => {
        switch (betaTester.attributes.state) {
            case "INVITED":
                return "Invited";
            case "ACCEPTED":
                return "Accepted";
            case "INSTALLED":
                return "Installed";
            case "DECLINED":
                return "Declined";
            case "NOT_INVITED":
                return "No Builds Available";
            default:
                const state = betaTester.attributes.state ?? "";
                const capitalized = state.toLowerCase().charAt(0).toUpperCase() + state.slice(1);
                return capitalized;
        }
    }

    const iconForState = (betaTester: BetaTester) => {
        switch (betaTester.attributes.state) {
            case "INVITED":
                return { source: Icon.Dot, tintColor: Color.Yellow };
            case "ACCEPTED":
                return { source: Icon.Dot, tintColor: Color.Green };
            case "INSTALLED":
                return { source: Icon.Dot, tintColor: Color.Green };
            case "DECLINED":
                return { source: Icon.Dot, tintColor: Color.Red };
            case "NOT_INVITED":
                return { source: Icon.Dot, tintColor: Color.Red };
            default:
                return Icon.Dot;
        }
    }
    const listAccessory = (betaTester: BetaTester): any => {
        const usage = getBetaTesterUsage(betaTester);
        const accessories = [];
        if (usage) {
            accessories.push({ text: usage.values.sessionCount.toString(), icon: { source: Icon.Mobile, tintColor: Color.Green }, tooltip: "Sessions" });
            accessories.push({ text: usage.values.crashCount.toString(), icon: { source: Icon.Exclamationmark, tintColor: Color.Red }, tooltip: "Crashes" });
            accessories.push({ text: usage.values.feedbackCount.toString(), icon: { source: Icon.Envelope, tintColor: Color.Yellow }, tooltip: "Feedback" });
        }
        if (betaTester.attributes.state) {
            accessories.push({ text: textForState(betaTester), icon: iconForState(betaTester) });
        }
        return accessories;
    };

    console.log(testers.map((tester: BetaTester) => tester.attributes.inviteType));

    return (
        <List 
            isLoading={isLoadingBetaGroup || isLoadingBetaTesterUsages}
            pagination={pagination}
            actions={
                <ActionPanel>
                    {group.attributes.isInternalGroup ?
                        <>
                            <Action.Push title="Add multiple testers" icon={Icon.AddPerson} target={<InternalBetaGroupTesters app={app} group={group} didUpdateNewTesters={(newTesters) => {
                                setTesters(testers.concat(newTesters));
                            }} />}/> 
                            
                            <Action.Push title="Manage Builds" icon={Icon.Building} target={<ManageInternalBuilds 
                                app={app} 
                                group={group} 
                                didAddBuilds={(builds) => {
                                    
                                }}
                                didRemoveBuilds={(builds) => {
                                    
                                }}
                            />}/>
                        </>
                        :
                        <>
                            <Action.Push title="Add new tester" icon={Icon.AddPerson} target={<AddExternalBetaTester group={group} app={app} didUpdateNewTester={(newTester) => {
                                setTesters(testers.concat(newTester));
                            }} />
                            }/>
                            <Action.Push title="Add multiple testers" icon={Icon.AddPerson} target={<ExternalBetaGroupTesters group={group} app={app} didUpdateNewTesters={(newTesters) => {
                                setTesters(testers.concat(newTesters));
                            }} />
                            }/>
                        </>
                        }
                </ActionPanel>
            }
        >
                {testers?.map((tester: BetaTester) => (
                    <List.Item
                        title={tester.attributes.inviteType === "PUBLIC_LINK" ? tester.attributes.firstName : tester.attributes.firstName + " " + tester.attributes.lastName}
                        subtitle={tester.attributes.inviteType === "PUBLIC_LINK" ? "Public link" ?? "" : tester.attributes.email ?? ""}
                        key={tester.id}
                        icon={{ source: Icon.Person }}
                        accessories={listAccessory(tester)}
                        actions={
                            <ActionPanel>
                                <Action.Push title="Add new tester" icon={Icon.AddPerson} target={<AddExternalBetaTester group={group} app={app} didUpdateNewTester={(newTesters) => {
                                    setTesters(testers.concat(newTesters));
                                    }} />
                                }/>
                                <Action.Push title="Add multiple testers" icon={Icon.AddPerson} target={group.attributes.isInternalGroup ? <InternalBetaGroupTesters app={app} group={group} didUpdateNewTesters={(newTesters) => {
                                    setTesters(testers.concat(newTesters));
                                }} /> : <ExternalBetaGroupTesters group={group} app={app} didUpdateNewTesters={(newTesters) => {
                                    setTesters(testers.concat(newTesters));
                                }} />}/>
                                <Action title="Remove from group" style={Action.Style.Destructive} icon={Icon.Trash} onAction={() => {
                                    (async () => {
                                        if (await confirmAlert({ title: "Are you sure?", primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive }})) { 
                                            setTesters(testers.filter(t => t.id !== tester.id));
                                            await fetchAppStoreConnect(`/betaTesters/${tester.id}/relationships/betaGroups`, "DELETE", {
                                                data: [{
                                                    type: "betaGroups",
                                                    id: group.id
                                                }]
                                            });
                                        }
                                    })();
                                }} />
                                <Action.Push title="Manage Builds" icon={Icon.Building} target={<ManageInternalBuilds 
                                    app={app} 
                                    group={group} 
                                    didAddBuilds={(builds) => {
                                        
                                    }}
                                    didRemoveBuilds={(builds) => {
                                        
                                    }}
                                />}/>
                            </ActionPanel>
                        }
                    />
                ))}
        </List>
    );
}