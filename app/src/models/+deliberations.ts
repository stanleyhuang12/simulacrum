import { Simulacrum } from './+simulacrum';


export class Deliberation extends Simulacrum {
    public ideology: string;
    public lawmaker_name: string;

    constructor(
        _username: string, 
        _group: string,
        _simulacrum_type: string = 'Deliberations',
        policy_topic: string,
        state: string,
        num_agents: number=1,
        committee_name: string,
        ideology: string,
        lawmaker_name: string
    ) {
        super(_username, _group, _simulacrum_type, policy_topic, state, num_agents, committee_name); // call parent constructor first
        this.ideology = ideology;
        this.lawmaker_name = lawmaker_name;
    }
    private _log_episodal_memory() {
    // method body
    }

    private _manage_and_cache_responses() {
        // method body
    }

    private _retrieve_memory() {
        // method body
    }

}
