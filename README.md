<div align="center">

<a href="">
  <picture>
    <source srcset="./resources/images/kv_pc.png" type="image/avif" width="80%" />
    <img src="./resources/images/kv_pc.png" width="80%" />
</picture>

[![maimai-plugin](https://img.shields.io/badge/GitHub仓库-maimai--plugin-9cf?style=for-the-badge&logo=github)](https://github.com/a1panda/maimai-plugin)
[![maimai-plugin](https://img.shields.io/badge/Gitee仓库-maimai--plugin-9cf?style=for-the-badge&logo=gitee)](https://gitee.com/a1_panda/maimai-plugin)

![version](https://img.shields.io/badge/版本-0.0.1-9cf?style=for-the-badge)
![version](https://img.shields.io/badge/maimai-2025.01-6cf?style=for-the-badge)

[![YunzaiBot](https://img.shields.io/badge/Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/yoimiya-kokomi/Yunzai-Bot)
[![MiaoYunzai](https://img.shields.io/badge/Miao--Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/yoimiya-kokomi/Miao-Yunzai)
[![TrssYunzai](https://img.shields.io/badge/TRSS--Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/TimeRainStarSky/Yunzai)

### 中文 | [English](./README_en.md)

</div>
<br>

------

### 安装：

在Yunzai目录下运行

> 使用Github

```
git clone --depth=1 https://github.com/A1Panda/maimai-plugin.git ./plugins/maimai-plugin/ 
cd ./plugins/maimai-plugin/
pnpm install -P
```

> 使用Gitee

```
git clone --depth=1 https://gitee.com/A1Panda/maimai-plugin.git ./plugins/maimai-plugin/
cd ./plugins/maimai-plugin/
pnpm install -P
```

> 注意：插件已内置 maimai.lxns.net 的公共 API Token，无需额外配置即可使用。

------

### 功能

以下#均可用/代替，命令头可自定义

#### **以下为用户功能**

| **功能名称** | **功能说明**
| :- | :-
| `#mai 帮助` | 获取帮助✔️
| `#mai bind xxx` | 绑定查分器账号✔️
| `#mai unbind` | 解绑查分器账号✔️
| `#mai info` | 查看个人信息✔️
| `#mai b50` | 查看B50成绩✔️
| `#mai recent` | 查看最近游玩记录✖️
| `#mai score 曲名` | 查询单曲成绩✔️
| `#mai search ID` | 搜索(支持音频、头像、曲绘、名牌、姓名框)✔️
| `#mai random` | 随机一首歌✔️
| `#mai plate` | 查看名牌进度✖️
| `#mai rank` | 查看排行榜✖️

#### **以下为管理功能**

| 功能名称 | 功能说明
| :- | :-
| `#mai 更新` | 更新插件✔️
| `#mai 设置` | 修改插件设置✖️
| `#mai 清除资源` | 清除过期的临时数据✔️
| `#mai 重置配置文件` | 重置因为更新变化的配置文件（自己的数据一定要保存好）✔️

------

### Todo

* [✔️] 优化界面设计
* [ ] 添加小游戏功能
* [ ] 支持适配水鱼API
* [ ] 添加更多查分功能
* [ ] 支持自定义主题
* [ ] 添加成就系统
* [ ] 添加竞赛功能

------

### 预览

[在这里添加一些功能截图预览]

------
### 致谢名单

* 感谢[Catrong](https://gitee.com/catrong)提供的插件开发思路
* 感谢[Yunzai-Bot](https://gitee.com/yoimiya-kokomi/Yunzai-Bot)提供的插件开发框架
* 感谢[Miao-Yunzai](https://gitee.com/yoimiya-kokomi/Miao-Yunzai)提供的插件开发框架
* 感谢[TRSS-Yunzai](https://gitee.com/TimeRainStarSky/Yunzai)提供的插件开发框架

------

### 免责声明

1. 功能仅限内部交流与小范围使用，请勿将`Yunzai-Bot`及`maimai-Plugin`用于任何以盈利为目的的场景
2. 图片与其他素材均来自于网络，仅供交流学习使用，如有侵权请联系，会立即删除
3. 本插件与舞萌DX官方无关，仅供学习交流使用

------

如有问题请提issue或加入QQ交流群:[511802473](https://qm.qq.com/cgi-bin/qm/qr?k=_ijLWFUaVZcbFZo4plw8TTrlKYA6_z8o&jump_from=webapi&authKey=IUMFkY4CWqXcnS75X6tQZ5pmVfx5X3SDpmfqDqGnmNJDAdUyrj+x7a1fWOQ3mOQ4)
