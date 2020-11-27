import "./HubMain.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { 
    getClient,
    CommonServiceIds,
    IProjectPageService, 
    IHostNavigationService } from "azure-devops-extension-api";
import { GitRestClient, 
    GitRepository, 
    GitPullRequestSearchCriteria,
    GitRef,
    GitPullRequest,
    GitCommitRef,
    GitQueryCommitsCriteria,
    PullRequestStatus,
    GitHistoryMode } from "azure-devops-extension-api/Git";
import { Page } from "azure-devops-ui/Page";
import { Card } from "azure-devops-ui/Card";
import { Icon } from "azure-devops-ui/Icon";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Link } from 'azure-devops-ui/Link';
import * as moment from 'moment';
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";

type repoData = [GitRepository, GitRef[], GitPullRequest[], GitCommitRef[]];

interface IRepositoriesServiceHubContentState {
    repos: GitRepository[] | null;
    repos2: repoData[] | null;
}

const client: GitRestClient = getClient(GitRestClient);

export class HubMain extends React.Component<{}, IRepositoriesServiceHubContentState> { 
    
    
    constructor(props: {})
    {
        super(props);

        this.state = { repos: null, repos2: null };
    }
    
    public async componentDidMount() {
        SDK.init();

        const searchCriteria: GitPullRequestSearchCriteria = { 
            creatorId: "",
            includeLinks: false,
            repositoryId: "",
            reviewerId: "",
            sourceRefName: "",
            sourceRepositoryId: "",
            targetRefName: "",
            status: PullRequestStatus.Active 
        };

        const oneYearFromNow: Date = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() - 1);
    
        let gitQueryCommitsCriteria: GitQueryCommitsCriteria = {
            $skip: 0,
            $top: 50,
            author: "",
            compareVersion: null,
            excludeDeletes: true,
            fromCommitId: "",
            fromDate: "",
            historyMode: GitHistoryMode.SimplifiedHistory,
            ids: [],
            includeLinks: false,
            includePushData: false,
            includeUserImageUrl: false,
            includeWorkItems: false,
            itemPath: "",
            itemVersion: null,
            toCommitId: "",
            user: "",
            toDate: ""
        };

        

        const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const currentProject = await projectService.getProject();

        const repos: GitRepository[] = await client.getRepositories(currentProject?.name);
        
        let refs: GitRef[];
        let pr: GitPullRequest[];
        let commits: GitCommitRef[]; 
        let repos2: repoData[] = [];
        for(var item in repos) {
            refs = await client.getRefs(repos[item].id, repos[item].project.name, "heads/");
            pr = await client.getPullRequests(repos[item].id, searchCriteria);
            commits = await client.getCommits(repos[item].id, gitQueryCommitsCriteria);
            repos2.push([repos[item], refs, pr, commits]);
        } 

        this.setState({repos});
        this.setState({repos2});

        //SDK.notifyLoadSucceeded();
    }

    public render(): JSX.Element {
        return(
            <Page className="flex-grow">
                <Header title="Git Repositories" titleSize={TitleSize.Medium} />
                {
                    !this.state.repos2 && 
                    <p style={{padding: "10px"}}>Loading...</p>
                }
                {
                    this.state.repos2 &&
                    <div style={{ display: "flex", flexWrap: "wrap", width: "100%", padding: "10px"}}>
                    {
                        this.state.repos2?.map((items) => (
                            <div>
                            <Card className="flex-grow repo-card" titleProps={{ text: items[0].name }} headerCommandBarItems={this.buildCommandBarItems(items[0])}>
                                <div className="flex-column mr-3">
                                    <p><Link onClick={() => this.navigateTo(items[0].webUrl+"/branches")} subtle={true}><Icon ariaLabel="BranchFork2 icon" iconName="BranchFork2" /> {items[1].length}</Link></p>
                                </div>
                                <div className="flex-column mr-3">
                                    <p><Link onClick={() => this.navigateTo(items[0].webUrl+"/pullrequests")} subtle={true}><Icon ariaLabel="BranchFork2 icon" iconName="BranchPullRequest" /> {items[2].length}</Link></p>
                                </div>
                                <div className="flex-column mr-3">
                                    <p>{this.formatBytes(items[0].size)}</p>
                                </div>
                                <div className="flex-column mr-3">
                                    {this.duration(items[3])}
                                </div>
                            </Card>
                            </div>
                        ))                        
                    }
                    </div>
                }
                
            </Page>
        );
    }

    // From https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    private formatBytes(bytes: number, decimals: number = 2): string {
        if(bytes === 0) return "0 Bytes";
        
        const dm: number = 0 > decimals? 0 : decimals, d:number = Math.floor(Math.log(bytes)/Math.log(1024));
        return parseFloat((bytes/Math.pow(1024, d)).toFixed(dm)) +" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d];
    }

    private duration(commitRefs: GitCommitRef[]): JSX.Element {
        if(commitRefs.length == 0) return <p className="font-weight-light"><i>No commit found</i></p>;
     
        const lastCommitDate: Date = commitRefs[0].committer.date;

        return <p>Updatde {moment([lastCommitDate.getFullYear(), lastCommitDate.getMonth(), lastCommitDate.getDate()]).fromNow()}</p>;
    }

    private buildCommandBarItems(repo: GitRepository): IHeaderCommandBarItem[] {
        return [
            {
                important: true,
                id: "gotoRepo",
                onActivate: () => {
                    this.navigateTo(repo.webUrl);
                },
                iconProps: {
                    iconName: "NavigateForward"
                },
                tooltipProps: {
                    text: `Go to ${repo.name} repository`
                }
            }
        ]
    }

    private async navigateTo(url: string): Promise<void> {
        const dialogService = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
        dialogService.navigate(url);
    }

}