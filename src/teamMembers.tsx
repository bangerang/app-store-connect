
import {ActionPanel, Action, List, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchAppStoreConnect, useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { UserInvitation, userInvitationsSchemas } from "./Model/schemas";
import SignIn from "./Components/SignIn";
import { usersSchema, User } from "./Model/schemas";
import InviteTeamMember from "./Components/InviteTeamMember";
import { presentError } from "./Utils/utils";
import EditTeamMember from "./Components/EditTeamMember";

export default function Command() {
const [path, setPath] = useState<string | undefined >(undefined)
const [invitedPath, setInvitedPath] = useState<string | undefined >(undefined)

const { data: fetchedUsers, isLoading, pagination } = useAppStoreConnectApi(path, (response) => {
    return usersSchema.safeParse(response.data).data ?? null;
});

const { data: fetchedInvited, isLoading: isLoadingInvited } = useAppStoreConnectApi(invitedPath, (response) => {
    return userInvitationsSchemas.safeParse(response.data).data ?? null;
});

const [allUsers, setAllUsers] = useState<User[]>(fetchedUsers ?? []);

const [allInvitedUsers, setAllInvitedUsers] = useState<UserInvitation[]>(fetchedInvited ?? []);

useEffect(() => {
    setAllInvitedUsers(fetchedInvited ?? []);
}, [fetchedInvited]);

useEffect(() => {
    let foundedUsers: User[] = [];
    for (const user of fetchedUsers ?? []) {
        if (foundedUsers.find(u => u.id === user.id)) {
            continue;
        }
        foundedUsers.push(user);
    }
    setAllUsers(foundedUsers);
}, [fetchedUsers]);

const allowedRoles = [
    "ADMIN",
    "APP_MANAGER",
    "CUSTOMER_SUPPORT",
    "DEVELOPER",
    "FINANCE",
    "MARKETING",
    "SALES",
    "ACCOUNT_HOLDER",
];

const rolesString = (roles: string[]) => {
    if (roles.length === 0) {
        return "";
    }
    const allowedRolesString = roles.filter((role) => allowedRoles.includes(role)).map((role) => {
        const lowerCase = role.toLowerCase();
        const capitalized = lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
        const replaceUnderscore = capitalized.replace("_", " ");
        return replaceUnderscore;
    }).join(", ");
    if (allowedRolesString.length > 0) {
        return allowedRolesString;
    }
    return "";
}

const makeTitle = (user: User) => {
    const firstName = user.attributes.firstName ?? "";
    const lastName = user.attributes.lastName ?? "";
    if (firstName === "" && lastName === "") {
        return user.attributes.username ?? "";
    }
    return firstName + " " + lastName;
}

  return (
    <SignIn didSignIn={() => {
      setPath("/users")
      setInvitedPath("/userInvitations")
    }}>
        <List 
            isLoading={isLoading || isLoadingInvited}
            pagination={pagination}
            actions={
                <ActionPanel>
                    <Action.Push title="Invite team member" target={<InviteTeamMember didInviteNewUser={(user) => {
                        setAllInvitedUsers([...allInvitedUsers, user]);
                    }} />} />
                </ActionPanel>
            }
        >
            {(allInvitedUsers || []).length > 0 && (
            <List.Section title="Invited">
                {allInvitedUsers.map((user: UserInvitation) => (
                    <List.Item
                    title={user.attributes.firstName + " " + user.attributes.lastName}
                    subtitle={user.attributes.email}
                    accessories={[
                        { text: rolesString(user.attributes.roles), tooltip: "Roles" }
                    ]}
                    actions={
                        <ActionPanel>
                            <Action title="Revoke" style={Action.Style.Destructive} onAction={async () => {
                                if (await confirmAlert({ title: "Are you sure?", primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive }})) { 
                                    const revoked = allInvitedUsers.find((user) => user.id === user.id);
                                    try {
                                        setAllInvitedUsers(allInvitedUsers.filter((user) => user.id !== user.id));
                                        await fetchAppStoreConnect(`/userInvitations/${user.id}`, "DELETE");
                                    } catch (error) {
                                        if (revoked) {
                                            setAllInvitedUsers([...allInvitedUsers, revoked]);
                                        }
                                        presentError(error);
                                    }
                                }  
                            }} />
                            <Action.Push title="Invite team member" target={<InviteTeamMember didInviteNewUser={(user) => {
                                setAllInvitedUsers([...allInvitedUsers, user]);
                            }} />} />
                        </ActionPanel>
                    }
                    />
                ))}
            </List.Section>
            )}
            <List.Section title="Team members">
                {allUsers?.map((user: User) => (
                    <List.Item
                    title={makeTitle(user)}
                    key={user.id}
                    subtitle={user.attributes.username}
                    accessories={[
                        { text: rolesString(user.attributes.roles), tooltip: "Roles" }
                    ]}
                    actions={
                        <ActionPanel>
                            <Action.Push title="Edit" target={<EditTeamMember user={user} userChanged={(newUser) => {
                                setAllUsers(allUsers.map((user) => {
                                    if (user.id === newUser.id) {
                                        return newUser;
                                    }
                                    return user;
                                }));
                            }} />} />
                            <Action title="Remove" style={Action.Style.Destructive} onAction={async () => {
                                if (await confirmAlert({ title: "Are you sure?", primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive }})) { 
                                    const removed = allUsers.find((user) => user.id === user.id);
                                    try {
                                        setAllUsers(allUsers.filter((user) => user.id !== user.id));
                                        await fetchAppStoreConnect(`/users/${user.id}`, "DELETE");
                                    } catch (error) {
                                        if (removed) {
                                            setAllUsers([...allUsers, removed]);
                                        }
                                        presentError(error);
                                    }
                                }  
                            }} />
                            <Action.Push title="Invite team member" target={<InviteTeamMember didInviteNewUser={(user) => {
                                setAllInvitedUsers([...allInvitedUsers, user]);
                            }} />} />
                        </ActionPanel>
                    }
                    />
                ))}
            </List.Section>
        </List>
    </SignIn>
  );
}

