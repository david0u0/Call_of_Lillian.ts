import * as PIXI from "pixi.js";
import { IKnownCard } from "../../game_core/interface";

/**
 * 可以重複新增同一個資源，也可以在加載期間持續新增，或是加載過程中增添處理回調
 */
class CardLoader {
    public resources: { [index: string]: PIXI.loaders.Resource } = {};
    
    private loader = new PIXI.loaders.Loader();
    private added_table: { [index: string]: boolean } = {};
    private added_table_backup: { [index: string]: boolean } = {};
    private pending = new Array<() => void>();
    private loading = false;

    constructor() {
        this.add("img_not_found").load(() => {});
        this.loader.onComplete.add(() => this.onComplete());
    }

    add(arg: string | IKnownCard): CardLoader {
        if(typeof (arg) == "string") {
            if(!this.resources[arg] && !this.added_table[arg] && !this.added_table[arg]) {
                if(this.loading) {
                    this.added_table_backup[arg] = true;
                } else {
                    this.added_table[arg] = true;
                }
            }
            return this;
        } else {
            return this.add(arg.abs_name);
        }
    }
    load(func: () => void) {
        if(this.loading) {
            this.pending.push(func);
        } else if(Object.keys(this.added_table).length != 0) {
            this.pending.push(func);
            this.loadAll();
        } else {
            func();
        }
    }
    loadAll() {
        this.loading = true;
        for(let name of Object.keys(this.added_table)) {
            this.loader.add(name, `/card_image/${name}.jpg`);
        }
        this.loader.load();
    }
    private onComplete() {
        for(let name of Object.keys(this.added_table)) {
            this.resources[name] = this.loader.resources[name];
            if(!this.resources[name] || this.resources[name].error) {
                this.resources[name] = this.resources["img_not_found"];
            }
        }
        let done = (Object.keys(this.added_table_backup).length == 0);
        this.added_table = this.added_table_backup;
        this.added_table_backup = {};
        if(done) {
            let t = this.pending;
            this.pending = [];
            for(let pending_func of t) {
                pending_func();
            }
            this.loading = false;
        } else {
            this.loadAll();
        }
    }
}

let my_loader = new CardLoader();
export { my_loader };