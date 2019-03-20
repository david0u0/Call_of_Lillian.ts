## 各事件流程
* 當一張卡從場上退場
    - 卡.card_retire_chain -> 世界.retire_chain -> 卡.card_leave_chain
* 當一張卡從場上消滅
    - 卡.card_leave_chain
* 計算角色、場地、事件的費用
    - 卡.get_mana_cost_chain -> 世界.get_mana_cost_chain
* 計算升級卡的費用
    - 卡.get_mana_cost_chain -> 世界.get_mana_cost_chain -> 世界.get_upgrade_cost_chain