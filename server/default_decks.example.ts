import { IDeck } from "./database";

let default_deck_list: { abs_name: string, count: number }[] = [
    { abs_name: "姆咪姆咪學園", count: 3 },
    { abs_name: "工作狂小紅", count: 3 },
    { abs_name: "廢怯小跟班", count: 3 },
    { abs_name: "u_test0", count: 3 },
    { abs_name: "雨季的魔女．語霽", count: 3 },
    { abs_name: "迷糊工程師．八喵", count: 3 },
    { abs_name: "殲滅戰", count: 3 },
    { abs_name: "市立圖書館", count: 3 },
    { abs_name: "質因數分解魔法", count: 3 },
    { abs_name: "快樂魔藥", count: 3 },
    { abs_name: "九世軍魂", count: 3 },
    { abs_name: "傭兵學校", count: 3 },
    { abs_name: "義體維護廠", count: 3 },
    { abs_name: "緊急醫療", count: 3 },
    { abs_name: "代理戰爭", count: 3 },
    { abs_name: "大衛化", count: 3 },
    { abs_name: "彩虹橋下的酒館", count: 3 },
    { abs_name: "勇氣之歌", count: 3 },
    { abs_name: "沒有魔法的世界", count: 3 },
    { abs_name: "游擊隊長小芳", count: 3 },
    { abs_name: "事件仲介所", count: 3 },
    { abs_name: "修羅事變", count: 3 },
    { abs_name: "掠奪者B型", count: 3 },
    { abs_name: "甜點吃到飽", count: 3 },
    { abs_name: "意識遊樂場", count: 3 },
    { abs_name: "真正的魔法", count: 3 },
    { abs_name: "集體飛升", count: 3 },
    { abs_name: "違停派對", count: 3 },
];

let default_user_decks: IDeck[] = [
    {
        name: "基礎套牌",
        list: default_deck_list
    }, {
        name: "幹架套牌",
        list: default_deck_list
    }
];

export { default_user_decks, default_deck_list };