import { Detail, Icon } from "@raycast/api";
import { LocalStorage, ActionPanel, Form, Action, List, useNavigation, open } from "@raycast/api";
import React, { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { App, appSchemas } from "./Model/schemas";
import AppItem from "./Components/AppItem";
import SignIn from "./Components/SignIn";
import BuildList from "./Components/BuildList";

export default function Command() {
  const [path, setPath] = useState<string | undefined>(undefined)

  const { data, isLoading } = useAppStoreConnectApi(path, (response) => {
    return appSchemas.safeParse(response.data).data;
  });

  return (
    <SignIn didSignIn={() => {
      setPath("/apps")
    }}>
      <List
        isLoading={isLoading}
      >
        {data?.map((app: App) => (
          <AppItem
            id={app.id}
            title={app.attributes.name}
            app={app}
            actions={
              <ActionPanel>
                <Action.Push title="Show Builds" icon={Icon.Building} target={<BuildList app={app} />} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </SignIn>
  );
}

