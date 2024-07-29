import { ActionPanel, Action, List } from "@raycast/api";
import { useState} from "react";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { App, appSchemas } from "./Model/schemas";
import AppItem from "./Components/AppItem";
import SignIn from "./Components/SignIn";
import TestInformation from "./Components/TestInformation";

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
          id={app.id}
          title={app.attributes.name}
          app={app}
          actions={
            <ActionPanel>
                <Action.Push title="Show Test Information" target={<TestInformation app={app} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
    </SignIn>
  );
}

