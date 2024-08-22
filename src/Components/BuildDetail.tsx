import { ActionPanel, Form, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Build, App, betaGroupsSchema, buildSchemasWithBetaGroups, BetaGroup, betaBuildLocalizationsSchema, BuildWithBetaDetailAndBetaGroups, buildsWithBetaDetailSchema, AppStoreVersion } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { presentError } from "../Utils/utils";

interface BuildDetailProps {
    build: BuildWithBetaDetailAndBetaGroups;
    app: App;
    groupsDidChange: (groups: BetaGroup[]) => void;
    betaStateDidChange: (betaState: string) => void;
}

type SubmitType = "UPDATE_WHAT_TO_TEST" | "SUBMIT_FOR_BETA_REVIEW" | "ADD_GROUPS_TO_BUILD" | "REMOVE_GROUPS_FROM_BUILD";

export default function BuildDetail({ build, app, groupsDidChange, betaStateDidChange }: BuildDetailProps) {
    const { data: betaGroups, isLoading: isLoadingBetaGroups } = useAppStoreConnectApi(`/betaGroups?filter[app]=${app.id}`, (response) => {
        return betaGroupsSchema.safeParse(response.data).data ?? null;
    });
    const { data: betaBuildLocalizations, isLoading: isLoadingBetaBuildLocalizations } = useAppStoreConnectApi(`/builds/${build.build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`, (response) => {
        return betaBuildLocalizationsSchema.safeParse(response.data).data ?? null;
    });
    const [usedGroups, setUsedGroups] = useState<BetaGroup[]>([]);
    const [previousUsedGroups, setPreviousUsedGroups] = useState<BetaGroup[] | undefined>(undefined); 
    const [usedGroupsIDs, setUsedGroupIDs] = useState<string[]>([]);
    const [currentWhatToTest, setCurrentWhatToTest] = useState<string>("");
    const [whatToTestError, setWhatToTestError] = useState<string | undefined>();
    const [submitIsLoading, setSubmitIsLoading] = useState<boolean>(false);
    const [removedGroups, setRemovedGroups] = useState<BetaGroup[]>([]);
    const [addedGroups, setAddedGroups] = useState<BetaGroup[]>([]);

    function dropWhatToTestErrorIfNeeded() {
        if (whatToTestError !== undefined) {            
            setWhatToTestError(undefined);
        }
    }

    useEffect(() => {
        if (betaGroups !== null && betaGroups.length > 0) {
            build.betaGroups.forEach(betaGroup => {
                betaGroups.forEach(bg => {
                    if (bg.id === betaGroup.id) {
                        setUsedGroups(prev => [...prev, bg]);
                        setUsedGroupIDs(prev => [...prev, bg.id]);
                    }
                });
            });
        }
    }, [build, betaGroups]);

    useEffect(() => {
        if (betaGroups === null || usedGroupsIDs === null) {
            return;
        }
        const newGroups = betaGroups?.filter(bg => usedGroupsIDs.includes(bg.id));
        if (previousUsedGroups !== undefined) {
            setRemovedGroups(previousUsedGroups?.filter(bg => newGroups?.find(bg2 => bg2.id === bg.id) === undefined));
            setAddedGroups(newGroups?.filter(bg => previousUsedGroups?.find(bg2 => bg2.id === bg.id) === undefined));
        }
        setPreviousUsedGroups(usedGroups);
        setUsedGroups(newGroups);
        dropWhatToTestErrorIfNeeded();
    }, [usedGroupsIDs, betaGroups]);

    useEffect(() => {
        // TODO: Handle localizations
        if (betaBuildLocalizations !== null && betaBuildLocalizations.length > 0) {
            setCurrentWhatToTest(betaBuildLocalizations[0].attributes.whatsNew ?? "");
        }
        
    }, [betaBuildLocalizations]);

    useEffect(() => {
       dropWhatToTestErrorIfNeeded();
    }, [currentWhatToTest]);


    const getSubmitTitle = () => {
        const types = getSubmitTypes();
        if (types.find(type => type === "SUBMIT_FOR_BETA_REVIEW")) {
            return "Submit for beta review";
        } else {
            return "Update"
        }
    };

    const getSubmitTypes = (): SubmitType[] => {
        const containsExternalGroups = usedGroups.find(bg => {
            return !bg.attributes.isInternalGroup;
        });
        if (build.buildBetaDetails.attributes.externalBuildState === "READY_FOR_BETA_SUBMISSION" && containsExternalGroups) {
            return ["SUBMIT_FOR_BETA_REVIEW"];
        }
        const types: SubmitType[] = [];
        if (betaBuildLocalizations && betaBuildLocalizations.length > 0 && currentWhatToTest !== betaBuildLocalizations[0].attributes.whatsNew) {
            types.push("UPDATE_WHAT_TO_TEST");
        }
        if (removedGroups.length > 0) {
            types.push("REMOVE_GROUPS_FROM_BUILD");
        }
        if (addedGroups.length > 0) {
            types.push("ADD_GROUPS_TO_BUILD");
        }
        return types;
    };

    const updateWhatToTest = async () => {
        setSubmitIsLoading(true);
        if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0) {
            return;
        }
        if (currentWhatToTest === betaBuildLocalizations[0].attributes.whatsNew) {
            return;
        }
        const response = await fetchAppStoreConnect(`/betaBuildLocalizations/${betaBuildLocalizations[0].id}`, "PATCH", {
            data: {
                type: "betaBuildLocalizations",
                id: betaBuildLocalizations[0].id,
                attributes: {
                    whatsNew: currentWhatToTest
                }
            }
        });
        if (response && !response.ok) {
            const error = constructError(response, "Could not update what to test");
            throw error;
        }
    };

    const constructError =  async(response: { text: () => Promise<string> }, fallbackMessage: string) => {
        const json = JSON.parse(await response.text());
        if ("errors" in json) {
            const errors = json.errors;
            if (errors.length > 0) {
                return new ATCError(errors[0].title, errors[0].detail);
            }
        } else {
            return new ATCError("Oh no!", fallbackMessage);
        }
    };

    const submitForBetaReview = async () => {
        setSubmitIsLoading(true);
        if (betaBuildLocalizations === null || betaBuildLocalizations.length === 0 || betaGroups === null) {
            return;
        }
        const response = await fetchAppStoreConnect(`/betaAppReviewSubmissions`, "POST", {
            data: {
                type: "betaAppReviewSubmissions",
                relationships: {
                    build: {
                        data: {
                            type: "builds",
                            id: build.build.id
                        }
                    }
                } 
            }
        });
        if (response && !response.ok) {
            const error = await constructError(response, "Could not submit for beta review");
            throw error;
        }
    };

    const addGroupsToBuild = async (newGroups: BetaGroup[]) => {
        setSubmitIsLoading(true);
        for (const group of newGroups) {
            const response = await fetchAppStoreConnect(`/builds/${build.build.id}/relationships/betaGroups`, "POST", {
                data: [
                    {
                        type: "betaGroups",
                        id: group.id
                    }
                ]
            });
            if (response && !response.ok) {
                const error = constructError(response, "Could not add group to build");
                throw error;
            }
        }
    };

    const removeGroupsFromBuild = async (removedGroups: BetaGroup[]) => {
        setSubmitIsLoading(true);
        for (const group of removedGroups) {
            const response = await fetchAppStoreConnect(`/betaGroups/${group.id}/relationships/builds`, "DELETE", {
                data: [
                    {
                        type: "builds",
                        id: build.build.id
                    }
                ]
            });
            if (response && !response.ok) {
                const error = constructError(response, "Could not remove group from build");
                throw error;
            }
        }
    };

    return (
        <Form 
            actions={
                <ActionPanel>
                    <Action.SubmitForm title={getSubmitTitle()} onSubmit={() => {
                        if (validateWhatToTest(currentWhatToTest, usedGroups)) {
                            const types = getSubmitTypes();
                            if (types.length === 1 && types[0] === "SUBMIT_FOR_BETA_REVIEW") {
                                (async () => {
                                    try {
                                        if (betaGroups === null) {
                                            return;
                                        }
                                        await updateWhatToTest();
                                        if (addedGroups.length > 0) {
                                            await addGroupsToBuild(addedGroups);
                                            groupsDidChange(usedGroups);
                                        }
                                        if (removedGroups.length > 0) {
                                            await removeGroupsFromBuild(removedGroups);
                                            groupsDidChange(usedGroups);
                                        }
                                        await submitForBetaReview();
                                        betaStateDidChange("SUBMITTED_FOR_BETA_REVIEW");
                                        setSubmitIsLoading(false);
                                        showToast({
                                            style: Toast.Style.Success,
                                            title: "Success!",
                                            message: "Submitted for beta review",
                                        });
                                    } catch (error) {
                                        presentError(error);
                                        setSubmitIsLoading(false);
                                    }
                                })();
                            } else {
                                (async () => {
                                    try {
                                        for (let i = 0; i < types.length; i++) {
                                            const type = types[i];
                                            switch (type) {
                                                case "UPDATE_WHAT_TO_TEST":
                                                    await updateWhatToTest();
                                                break;
                                                case "ADD_GROUPS_TO_BUILD":
                                                    if (addedGroups.length > 0) {
                                                        await addGroupsToBuild(addedGroups);
                                                        groupsDidChange(usedGroups);
                                                    }
                                                break;
                                                case "REMOVE_GROUPS_FROM_BUILD":
                                                    if (removedGroups.length > 0) {
                                                        await removeGroupsFromBuild(removedGroups);
                                                        groupsDidChange(usedGroups);
                                                    }
                                                break;
                                            }
                                        }
                                        setSubmitIsLoading(false);
                                        showToast({
                                            style: Toast.Style.Success,
                                            title: "Success!",
                                            message: "Updated build",
                                        });
                                    } catch (error) {
                                        presentError(error);
                                        setSubmitIsLoading(false);
                                    }
                                })();
                            }
                        } else {
                            setWhatToTestError("You must specify what to test");
                        }
                    }} />
                </ActionPanel>
            }
            isLoading={isLoadingBetaGroups || isLoadingBetaBuildLocalizations || submitIsLoading}>
                <Form.TagPicker id="betaGroups" title="Beta Groups" value={usedGroupsIDs} onChange={setUsedGroupIDs} >
                    {betaGroups?.map((bg) => (
                        <Form.TagPicker.Item value={bg.id} title={bg.attributes.name} key={bg.id} icon={{ source: Icon.Dot, tintColor: bg.attributes.isInternalGroup ? Color.Green : Color.Yellow }} />
                    ))}
                </Form.TagPicker>
                <Form.TextArea
                    id="description" 
                    placeholder="What to test" 
                    error={whatToTestError}
                    value={currentWhatToTest} 
                    onChange={(newValue) => setCurrentWhatToTest(newValue)} 
                    onBlur={(event) => {
                        const value = event.target.value;
                        if (validateWhatToTest(value, usedGroups)) {
                            dropWhatToTestErrorIfNeeded();
                        } else {
                            setWhatToTestError("You must specify what to test.");
                        }
                    }}
                    />
        </Form>
    );
}

class ATCError extends Error {
    constructor(
      public title: string,
      public detail: string
    ) {
      super(title);
      this.name = this.constructor.name;
      
      // Maintain proper stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ATCError);
      }
    }
}

function validateWhatToTest(whatToTest: string | undefined, usedGroups: BetaGroup[]) {
    const notInternal = usedGroups.find(bg => {
        return !bg.attributes.isInternalGroup;
    });
    if (!whatToTest && notInternal) {
        return false;
    }

    if (whatToTest === "" && notInternal) {
        return false;
    }
    return true;
}


