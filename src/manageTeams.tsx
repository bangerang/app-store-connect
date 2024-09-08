import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useTeams, Team } from "./Model/useTeams";
import { useEffect, useState } from "react";
import { confirmAlert, Alert } from "@raycast/api";
import AddTeam from "./Components/AddTeam";

export default function Command() {
    const { teams: teamsFromStorage, addTeam, deleteTeam, currentTeam: currentTeamFromStorage, selectCurrentTeam, removeCurrentTeam } = useTeams();
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeam, setCurrentTeam] = useState<Team | undefined>(undefined);

    useEffect(() => {
      setTeams(teamsFromStorage);
    }, [teamsFromStorage]);

    useEffect(() => {
      setCurrentTeam(currentTeamFromStorage);
    }, [currentTeamFromStorage]);

    useEffect(() => {
      console.log(teams);
    }, [ teams ]);

    const _deleteTeam = (team: Team) => {
      (async () => {
        if (await confirmAlert({ title: "Are you sure?", primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive }})) { 
            deleteTeam(team);
        }
      })();
    }

    const isCurrentTeam = (team: Team) => {
        return currentTeam?.apiKey === team.apiKey;
    }

    const accessoriesForTeam = (team: Team) => {
        if (isCurrentTeam(team)) {
            return [{ icon: Icon.CheckCircle, tooltip: "A person" }];
        } else {
            return undefined;
        }
    }
  return (
    <List
        actions={
          <ActionPanel>
            <Action.Push title="Add new team" icon={Icon.AddPerson} target={<AddTeam didSignIn={(team) => {
                setTeams([...teams, team]);
                setCurrentTeam(team);
            }}/>} />
          </ActionPanel>
        }
      >
        {teams?.map((team: Team) => (
          <List.Item
            title={team.name}
            accessories={accessoriesForTeam(team)}
            subtitle={team.apiKey}
            key={team.apiKey}
            actions={
              <ActionPanel>
                {!isCurrentTeam(team) && <Action title="Select Team" icon={Icon.CheckCircle} onAction={() => {
                    selectCurrentTeam(team);
                }} />}
                <Action.Push title="Add new team" icon={Icon.AddPerson} target={<AddTeam didSignIn={(team) => {
                    setTeams([...teams, team]);
                    selectCurrentTeam(team);
                }}/>} />
                <Action title="Delete Team" style={Action.Style.Destructive} icon={Icon.Trash} onAction={() => {
                  _deleteTeam(team);
                }} />
              </ActionPanel>
            }
          />
        ))}
      </List>
  );
}

