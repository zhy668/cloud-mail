<p align="center">
  <img src="doc/demo/logo.png" width="80px" />
</p>

<div align="center">
<h1>Cloud Mail</h1>
</div>
<div align="center">
    <h4>使用Vue3开发的响应式邮箱服务，支持邮件发送，无需服务器可部署到Cloudflare平台 🎉</h4> 
</div>
<div align="center">
    <span>简体中文 | <a href="/README-en.md" style="margin-left: 5px">English </a></span>
</div>

## 项目简介

只需要一个域名，就可以创建多个不同的邮箱，类似各大邮箱平台 QQ邮箱，谷歌邮箱等，本项目使用Cloudflare部署，Resend推送邮件，无需服务器费用，搭建自己的邮箱服务

## 项目展示

- [在线演示](https://skymail.ink)<br>
- [部署文档](https://doc.skymail.ink)<br>
- [小白保姆教程-界面部署](https://doc.skymail.ink/guide/via-ui.html)

| ![](/doc/demo/demo1.png) | ![](/doc/demo/demo2.png) |
|--------------------------|---------------------|
| ![](/doc/demo/demo3.png)      | ![](/doc/demo/demo4.png) |
| ![](/doc/demo/demo5.png)      | ![](/doc/demo/demo6.png) |
| ![](/doc/demo/demo7.png)      | ![](/doc/demo/demo8.png) |




## 功能介绍

- **💰 低成本使用**：无需服务器，部署到 Cloudflare Workers 降低使用成本

- **💻 响应式设计**：响应式布局自动适配PC和大部分手机端浏览器

- **📧 邮件发送**：集成resend发送邮件，支持群发，内嵌图片和附件发送，发送状态查看

- **🛡️ 管理员功能**：支持多管理员配置，可以对用户，邮件进行管理，RABC权限控制对功能及使用资源限制

- **🔀 多号模式**：开启后一个用户可以添加多个邮箱，默认一用户一邮箱，类似各大邮箱平台

- **📦 附件收发**：支持收发附件，使用R2对象存储保存和下载文件

- **🔔 邮件推送**：接收邮件后可以转发到TG机器人或其他服务商邮箱

- **📡 开放API**：支持使用API批量生成用户，多条件查询邮件，邮箱管理

- **📈 数据可视化**：使用echarts对系统数据详情，用户邮件增长可视化显示

- **⭐ 星标邮件**：标记重要邮件，以便快速查阅

- **🎨 个性化设置**：可以自定义网站标题，登录背景，透明度

- **⚙️ 功能设置**：可以对注册，邮件发送，添加等功能关闭和开启，设为私人站点

- **🤖 人机验证**：集成Turnstile人机验证，防止人机批量注册

- **📜 更多功能**：正在开发中...



## 技术栈

- **框架**：[Vue3](https://vuejs.org/) + [Element Plus](https://element-plus.org/) 

- **Web框架**：[Hono](https://hono.dev/)

- **ORM：**[Drizzle](https://orm.drizzle.team/)

- **平台：** [Cloudflare workers](https://developers.cloudflare.com/workers/)

- **邮件推送：** [Resend](https://resend.com/)

- **缓存**：[Cloudflare KV](https://developers.cloudflare.com/kv/)

- **数据库**：[Cloudflare D1](https://developers.cloudflare.com/d1/)

- **文件存储**：[Cloudflare R2](https://developers.cloudflare.com/r2/)


## 赞助


<a href="https://doc.skymail.ink/support.html" >
<img width="170px" src="./doc/images/support.png" alt="">
</a><br><br>


**特别赞助商**

[DartNode](https://dartnode.com)：提供云计算服务资源支持

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")

## 许可证

本项目采用 [MIT](LICENSE) 许可证	


## 交流

[Telegram](https://t.me/cloud_mail_tg)



