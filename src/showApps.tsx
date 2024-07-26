import { Detail } from "@raycast/api";
import { LocalStorage, ActionPanel, Form, Action, List, useNavigation, open } from "@raycast/api";
import React, { useEffect, useState, ReactNode } from "react";
import fs from "fs";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { App, AppWithIcon, appSchemas } from "./Model/schemas";
import AppItem from "./Components/AppItem";
import AppDetail from "./Components/AppDetail"
import SignIn from "./Components/SignIn";

export default function Command() {
const [path, setPath] = useState<string | undefined >(undefined)
const [apps, setApps] = useState<App[]>([]);

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
          key={app.id}
          app={app}
          actions={
            <ActionPanel>
              <Action title="Open in App Store Connect" onAction={() => 
                      open(`https://appstoreconnect.apple.com/apps/${app.id}//distribution/ios/version/inflight`)
                  } />
              <Action.CopyToClipboard title="Copy App ID" content={app.id} />
              <Action.CopyToClipboard title="Copy Bundle ID" content={app.attributes.bundleId} />
              <Action.CopyToClipboard title="Copy Name" content={app.attributes.name} />
              <Action.CopyToClipboard title="Copy SKU" content={app.attributes.sku} />
            </ActionPanel>
          }
        />
      ))}
    </List>
    </SignIn>
  );
}

