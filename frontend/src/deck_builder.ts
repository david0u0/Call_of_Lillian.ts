const basic_deck = [
    "姆咪姆咪學園", "姆咪姆咪學園", "姆咪姆咪學園",
    "工作狂小紅", "工作狂小紅", "工作狂小紅",
    "廢怯小跟班", "廢怯小跟班", "廢怯小跟班",
    "u_test0", "u_test0",
    "雨季的魔女．語霽", "雨季的魔女．語霽", "雨季的魔女．語霽",
    "迷糊工程師．八喵", "迷糊工程師．八喵", "迷糊工程師．八喵",
    "緊急醫療", "緊急醫療", "緊急醫療",
    "代理戰爭", "代理戰爭", "代理戰爭",
    "大衛化", "大衛化", "大衛化",
    "彩虹橋下的酒館", "彩虹橋下的酒館",
    "義體維護廠", "義體維護廠", "戰地醫院", "戰地醫院",
    "傭兵學校", "傭兵學校", "傭兵學校",
    "九世軍魂", "九世軍魂", "九世軍魂",
    "市立圖書館", "市立圖書館", "市立圖書館",
    "質因數分解魔法", "質因數分解魔法", "質因數分解魔法",
    "勇氣之歌", "勇氣之歌", "勇氣之歌",
    "集體飛升", "集體飛升", "集體飛升",
    "違停派對", "違停派對", "違停派對",
];

window.onload = () => {
    let my_input = document.getElementById("my_deck") as HTMLTextAreaElement;
    let enemy_input = document.getElementById("enemy_deck") as HTMLTextAreaElement;
    let btn = document.getElementById("start_btn");
    my_input.innerHTML = basic_deck.join(",\n");
    enemy_input.innerHTML = basic_deck.join(",\n");
    
    btn.onclick = () => {
        let href =`/?me=${my_input.value}&enemy=${enemy_input.value}`.replace(/ |\n/g, "");
        window.location.href = href;
    };
};
