# 美术、字体与研究依据

## 网页中的原创研究图

- `src/assets/landscape.png`：2026-10-03 生成辅助的青绿山水、南宋小景、敦煌设色研究板。源文件 SHA-256 为 `f6ad47f4978cd9bbf9dcbb6c32654b7984946663cba6f9cf539c570247c7e2bb`。
- `src/assets/forms.png`：同日生成并修订的人物、器物与造型语言研究板。修订源文件 SHA-256 为 `b571506306fc7dc770af9ef3ae0d26385f25519503af52b2349e084895520c2a`。

两图使用 image_gen 按本项目原创研究简报生成，没有用馆藏图进行编辑、裁切或拼贴。页面以 CSS 展示研究板的局部，不改变源文件。图像是现代转译示意，不是博物馆对象、历史服饰或建筑复原；不同路线有时借用相近的形式示意，不能将配图作为实物证据。

## 字体

`Guanwu Serif` 是本项目对 Google Fonts 公开发布的 Noto Serif SC 的衍生子集，固定字重 400，并重新命名字体族。原始文件来自 `google/fonts` 官方仓库：

https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf

原始 SHA-256：`050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9`。

网页包含修改后的 WOFF2 字体；来源、哈希与修改方式在 `src/assets/font-provenance.json`。字体采用 SIL Open Font License 1.1，以下保留原始许可证全文。正文和用户新输入也可使用系统中文字体。

## 文献与馆藏线索

具体作品和书目在 `src/data/traditions.ts`，研究方法在 `docs/research-method.md`。全部馆藏与文献条目当前为 `reference`，表示待核验线索。网络限制使本轮无法逐页读取博物馆网站，因此没有把条目或图片许可标为已核验。

制作期间可实际读取大都会艺术博物馆官方 GitHub 开放数据说明：

https://github.com/metmuseum/openaccess

其 README 获取成功，仅用于了解数据与图像权利的区别，不能证明上述具体中国艺术条目已经核验。本网页未打包或再分发该馆藏数据与图片。

参考颜色是现代数字制作起点，不是历史颜料的科学复原值。本文没有为被引用的馆藏图片重新授予使用许可。

## 字体原始许可证

Copyright 2012 Google Inc. All Rights Reserved.

This Font Software is licensed under the SIL Open Font License,
Version 1.1.

This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font
creation efforts of academic and linguistic communities, and to
provide a free and open framework in which fonts may be shared and
improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply to
any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software
components as distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to,
deleting, or substituting -- in part or in whole -- any of the
components of the Original Version, by changing formats or by porting
the Font Software to a new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed,
modify, redistribute, and sell modified and unmodified copies of the
Font Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components, in
Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the
corresponding Copyright Holder. This restriction only applies to the
primary font name as presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created using
the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
