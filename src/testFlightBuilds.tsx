import { Detail } from "@raycast/api";
import { LocalStorage, ActionPanel, Form, Action, List, useNavigation, open } from "@raycast/api";
import React, { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { App, AppWithIcon, appSchemas } from "./Model/schemas";
import AppItem from "./Components/AppItem";
import SignIn from "./Components/SignIn";
import BuildList from "./Components/BuildList";

export default function Command() {
const [path, setPath] = useState<string | undefined >(undefined)

const { data, isLoading } = useAppStoreConnectApi(path, appSchemas);


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
              <Action.Push title="Show Builds" target={<BuildList app={app} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
    </SignIn>
  );
}

