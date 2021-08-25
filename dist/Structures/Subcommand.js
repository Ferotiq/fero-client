/** @format */
export class Subcommand {
    name;
    description;
    aliases;
    permissions;
    parent;
    run;
    constructor(options, runFunction) {
        this.name = options.name;
        this.description = options.description;
        this.aliases = options.aliases;
        this.permissions = options.permissions;
        this.parent = options.parent;
        this.run = runFunction;
    }
}
