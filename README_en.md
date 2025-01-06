<div align="center">

<a href="">
  <picture>
    <source srcset="https://raw.githubusercontent.com/A1Panda/maimai-plugin/main/resources/image/kv_pc.png" type="image/avif" width="80%" />
    <img src="https://raw.githubusercontent.com/A1Panda/maimai-plugin/main/resources/image/kv_pc.png" width="80%" />
</picture>

[![maimai-plugin](https://img.shields.io/badge/GitHub-maimai--plugin-9cf?style=for-the-badge&logo=github)](https://github.com/a1panda/maimai-plugin)
[![maimai-plugin](https://img.shields.io/badge/Gitee-maimai--plugin-9cf?style=for-the-badge&logo=gitee)](https://gitee.com/a1_panda/maimai-plugin)

![version](https://img.shields.io/badge/version-0.0.1-9cf?style=for-the-badge)
![version](https://img.shields.io/badge/maimai-2025.01-6cf?style=for-the-badge)

[![YunzaiBot](https://img.shields.io/badge/Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/yoimiya-kokomi/Yunzai-Bot)
[![MiaoYunzai](https://img.shields.io/badge/Miao--Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/yoimiya-kokomi/Miao-Yunzai)
[![TrssYunzai](https://img.shields.io/badge/TRSS--Yunzai-v3.0-9cf?style=for-the-badge&logo=dependabot)](https://gitee.com/TimeRainStarSky/Yunzai)

### [中文](./README.md) | English

</div>
<br>

------

### Installation:

Run in Yunzai directory:

> Using Github

```
git clone --depth=1 https://github.com/A1Panda/maimai-plugin.git ./plugins/maimai-plugin/
cd ./plugins/maimai-plugin/
pnpm install -P
```

> Using Gitee

```
git clone --depth=1 https://gitee.com/A1Panda/maimai-plugin.git ./plugins/maimai-plugin/
cd ./plugins/maimai-plugin/
pnpm install -P
```

------

### Features

Commands can start with either # or /. Command prefix can be customized.

#### **User Commands**

| **Command** | **Description**
| :- | :-
| `#mai help` | Get help information
| `#mai bind xxx` | Bind maimai account
| `#mai unbind` | Unbind maimai account
| `#mai info` | View personal information
| `#mai b50` | View B50 scores
| `#mai recent` | View recent play records
| `#mai score <song name>` | Query single song score
| `#mai search <conditions>` | Search songs (supports difficulty, level, etc.)
| `#mai random` | Get a random song
| `#mai plate` | View plate progress
| `#mai rank` | View leaderboard
| `#mai search <type> <id>` | Search game resources (jacket/music/icon/plate)

#### **Admin Commands**

| Command | Description
| :- | :-
| `#mai update` | Update plugin
| `#mai settings` | Modify plugin settings
| `#mai ban @user` | Ban user from using the plugin
| `#mai unban @user` | Unban user
| `#mai clean cache` | Clean expired cache files (Master only)
| `#mai force clean cache` | Force clean all cache files (Master only)

------

### Todo

* [ ] Optimize UI design
* [ ] Add more score query features
* [ ] Support custom themes
* [ ] Add achievement system
* [ ] Add competition features
* [x] Add resource management features
* [x] Add cache cleaning features

------

### Preview

[Add feature screenshots here]

------

### Acknowledgments

* Thanks to [Catrong](https://gitee.com/catrong) for providing plugin development ideas

------

### Disclaimer

1. This functionality is intended for internal communication and small-scale use only. Do not use `Yunzai-Bot` and `maimai-Plugin` for any profit-driven purposes.
2. Images and other materials are from the internet, used for communication and learning purposes only. Please contact us for removal if there's any infringement.
3. This plugin is not affiliated with maimai DX official. For learning and communication purposes only.

------

For issues or questions, please submit an issue or join our QQ group: [511802473](https://qm.qq.com/cgi-bin/qm/qr?k=_ijLWFUaVZcbFZo4plw8TTrlKYA6_z8o&jump_from=webapi&authKey=IUMFkY4CWqXcnS75X6tQZ5pmVfx5X3SDpmfqDqGnmNJDAdUyrj+x7a1fWOQ3mOQ4)
