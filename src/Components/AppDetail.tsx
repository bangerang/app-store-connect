import { List, ActionPanel, Action, Image, Icon } from "@raycast/api";
import { App, AppWithIcon, buildSchema, Build } from "../Model/schemas";
import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";

export default function AppDetail({ app }: { app: App }) {

  return (
    <List>
        <List.Item
            icon={Icon.Rocket}
            title="TestFlight"
            />
    </List>
  );
}