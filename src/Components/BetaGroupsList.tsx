import { Icon, List, ActionPanel, Action, confirmAlert, Alert } from "@raycast/api";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { App, betaGroupsSchema, BetaGroup } from "../Model/schemas";
import { useEffect, useState } from "react";
import BetaGroupDetail from "./BetaGroupDetail";
import InternalBetaGroupBuilds from "./InternalBetaGroupBuilds";
import CreateNewGroup from "./CreateNewGroup";
import { presentError } from "../Utils/utils";
interface BetaGroupsListProps {
    app: App;
}
export default function BetaGroupsList({ app }: BetaGroupsListProps) {
    const { data: betaGroups, isLoading: isLoadingBetaGroups } = useAppStoreConnectApi(`/betaGroups?filter[app]=${app.id}`, (response) => {
        return betaGroupsSchema.safeParse(response.data).data ?? null;
    });
    const [externalGroups, setExternalGroups] = useState<BetaGroup[]>([]);
    const [internalGroups, setInternalGroups] = useState<BetaGroup[]>([]);

    useEffect(() => {
        if (betaGroups) {
            setExternalGroups(betaGroups.filter((betaGroup: BetaGroup) => !betaGroup.attributes.isInternalGroup));
            setInternalGroups(betaGroups.filter((betaGroup: BetaGroup) => betaGroup.attributes.isInternalGroup));
        }
    }, [betaGroups]);

    const didCreateNewGroup = (newGroup: BetaGroup) => {
        if (newGroup.attributes.isInternalGroup) {
            setInternalGroups([...internalGroups, newGroup]);
        } else {
            setExternalGroups([...externalGroups, newGroup]);
        }
    }

    const deleteGroup = async (group: BetaGroup) => {
        if (await confirmAlert({ title: "Are you sure?", primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive }})) { 
            if (group.attributes.isInternalGroup) {
                setInternalGroups(internalGroups.filter((betaGroup: BetaGroup) => betaGroup.id !== group.id));
            } else {
                setExternalGroups(externalGroups.filter((betaGroup: BetaGroup) => betaGroup.id !== group.id));
            }
            try {
                await fetchAppStoreConnect(`/betaGroups/${group.id}`, "DELETE");
            } catch (error) {
                presentError(error);
                if (group.attributes.isInternalGroup) {
                    setInternalGroups([...internalGroups, group]);
                } else {
                    setExternalGroups([...externalGroups, group]);
                }
            }
        }
    }

    return (
        <List 
            isLoading={isLoadingBetaGroups}
            actions={
                <ActionPanel>
                    <Action.Push title="Create New Group" icon={Icon.AddPerson} target={<CreateNewGroup app={app} didCreateNewGroup={didCreateNewGroup} />} />
                </ActionPanel>
            }
        >
            <List.Section title="Internal Groups">
                {internalGroups.map((betaGroup: BetaGroup) => (
                    <List.Item
                        title={betaGroup.attributes.name}
                        icon={{ source: Icon.TwoPeople }}
                        actions={
                            <ActionPanel>
                                <Action.Push
                                    title="Manage Group"
                                    icon={Icon.TwoPeople}
                                    target={
                                        <BetaGroupDetail app={app} group={betaGroup} />
                                    }
                                />
                                <Action.Push title="Create New Group" icon={Icon.AddPerson} target={<CreateNewGroup app={app} didCreateNewGroup={didCreateNewGroup} />} />
                                <Action title="Delete Group" style={Action.Style.Destructive} icon={Icon.Trash} onAction={async () => {
                                    await deleteGroup(betaGroup);
                                }} />
                            </ActionPanel>
                        }
                    />
                ))}
            </List.Section>
            <List.Section title="External Groups">
                {externalGroups.map((betaGroup: BetaGroup) => (
                    <List.Item
                        title={betaGroup.attributes.name}
                        icon={{ source: Icon.TwoPeople }}
                        actions={
                            <ActionPanel>
                                <Action.Push
                                    title="Manage Group"
                                    icon={Icon.TwoPeople}
                                    target={
                                        <BetaGroupDetail app={app} group={betaGroup} />
                                    }
                                />
                                <Action.Push title="Manage Builds" icon={Icon.Building} target={<InternalBetaGroupBuilds group={betaGroup} app={app} />}/>
                                <Action.Push title="Create New Group" icon={Icon.AddPerson} target={<CreateNewGroup app={app} didCreateNewGroup={didCreateNewGroup} />} />
                                <Action title="Delete Group" icon={Icon.Trash} onAction={async () => {
                                    await deleteGroup(betaGroup);
                                }} />
                                
                            </ActionPanel>
                        }
                    />
                ))}
            </List.Section>
        </List>
    );
}