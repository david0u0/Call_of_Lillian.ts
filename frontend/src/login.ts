export function getLoginBlock(ew: number, eh: number, ticker: PIXI.ticker.Ticker) {
    let container = new PIXI.Container();

    let rec = new PIXI.Graphics();
    rec.beginFill(0);
    rec.drawRoundedRect(0, 0, 22*ew, 22*eh, 10);
    container.addChild(rec);

    let message = new PIXI.Text("你好，守護者！", new PIXI.TextStyle({
        fontSize: Math.min(ew, eh) * 2,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        fill: 0xFFFFFF
    }));
    message.anchor.set(0.5, 0);
    message.position.set(11*ew, eh);
    container.addChild(message);

    let style = new PIXI.TextStyle({
        fontSize: Math.min(ew, eh)*1.2,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        fill: 0xFFFFFF
    });
    let message_name = new PIXI.Text("帳號", style);
    message_name.position.set(4*ew, 5*eh);
    let input_name = new Input(14*ew, 2*eh).container;
    input_name.position.set(4*ew, 6.7*eh);
    container.addChild(message_name);
    container.addChild(input_name);

    let message_pass = new PIXI.Text("密碼", style);
    message_pass.position.set(4*ew, 11*eh);
    let input_pass = new Input(14*ew, 2*eh).container;
    input_pass.position.set(4*ew, 12.7*eh);
    container.addChild(message_pass);
    container.addChild(input_pass);

    let btn1 = getButton(2*ew, 2*eh, "登入");
    btn1.position.set(19*ew, 19*eh);
    let btn2 = getButton(2*ew, 2*eh, "註冊");
    btn2.position.set(16*ew, 19*eh);
    container.addChild(btn1);
    container.addChild(btn2);

    let mouse_hover = false;
    container.alpha = 0.75;
    container.interactive = true;
    container.on("mouseover", () => {
        mouse_hover = true;
    });
    container.on("mouseout", () => {
        mouse_hover = false;
    });
    ticker.add(() => {
        if(mouse_hover && container.alpha <= 0.9) {
            container.alpha += 0.02;
        } else if(!mouse_hover && container.alpha >= 0.75) {
            container.alpha -= 0.02;
        }
    });

    container.position.set(10*ew, 10*eh);
    return container;
}
class Input {
    txt = "";
    private selected = false;
    private mouse_in = false;
    public container: PIXI.Container;
    constructor(width: number, height: number) {
        let container = new PIXI.Container();
        let rec = new PIXI.Graphics();
        rec.beginFill(0xffffff);
        rec.drawRoundedRect(0, 0, width, height, 3);
        container.addChild(rec);

        let rec2 = new PIXI.Graphics();
        rec2.beginFill(0xceebf8);
        rec2.drawRoundedRect(0, 0, width, height, 3);
        rec2.alpha = 0;
        container.addChild(rec2);

        let txt = new PIXI.Text("123", new PIXI.TextStyle({
            fontSize: height*0.7,
            fontFamily: "微軟正黑體",
            fontWeight: "bold",
            fill: 0x3d3d3d
        }));
        txt.anchor.set(0, 0.5);
        txt.position.set(width * 0.02, height/2);
        container.addChild(txt);

        let blur_handler = () => {
            if(!this.mouse_in) {
                this.selected = false;
                document.removeEventListener("mousedown", blur_handler);
                rec2.alpha = 0;
            }
        };
        container.interactive = true;
        container.on("mouseover", () => {
            this.mouse_in = true;
        });
        container.on("mouseout", () => {
            this.mouse_in = false;
        });
        container.on("click", () => {
            this.selected = true;
            document.addEventListener("mousedown", blur_handler);
            rec2.alpha = 1;
        });
        this.container = container;
    }
}

function getButton(width: number, height: number, message: string) {
    let container = new PIXI.Container();
    container.interactive = true;

    let style = new PIXI.TextStyle({
        fontSize: Math.min(height, width) * 0.7,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        textBaseline: "",
        fill: 0xFFFFFF
    });
    let txt = new PIXI.Text(message, style);
    txt.anchor.set(0.5, 0.5);
    txt.position.set(width/2, height/2);
    container.addChild(txt);

    let line = new PIXI.Graphics();
    line.lineStyle(2, 0xFFFFFF);
    line.moveTo(width*0.1, height);
    line.lineTo(width*0.9, height);
    container.addChild(line);
    line.alpha = 0;
    container.on("mouseover", () => {
        line.alpha = 1;
    });
    container.on("mouseout", () => {
        line.alpha = 0;
    });

    container.cursor = "pointer";
    return container;
}
