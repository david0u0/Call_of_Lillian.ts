import * as PIXI from "pixi.js";

class CardLoader {
    public resources: { [index: string]: PIXI.loaders.Resource } = {};

    private loader = new PIXI.loaders.Loader();
    private added_table: { [index: string]: boolean } = {};
    private added_table_backup: { [index: string]: boolean } = {};
    private pending = new Array<() => void>();
    private loading = false;

    add(name) {
        if(!this.resources[name] && !this.added_table[name]) {
            if(this.loading) {
                this.added_table_backup[name] = true;
            } else {
                this.added_table[name] = true;
            }
        }
        return this;
    }
    load(func: () => void) {
        if(this.loading) {
            this.pending.push(func);
        } else if(Object.keys(this.added_table).length != 0) {
            this.loading = true;
            this.pending.push(func);
            for(let name of Object.keys(this.added_table)) {
                this.loader.add(name, `/card_image/${name}.jpg`);
            }
            this.loader.load(() => {
                for(let name of Object.keys(this.added_table)) {
                    this.resources[name] = this.loader.resources[name];
                }
                for(let pending_func of this.pending) {
                    pending_func();
                }
                this.pending = [];
                this.added_table = this.added_table_backup;
                this.added_table_backup = {};
                this.loading = false;
            });
        } else {
            func();
        }
    }
}

let my_loader = new CardLoader();
export { my_loader };