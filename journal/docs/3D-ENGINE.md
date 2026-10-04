# 立体册页实现

版本：0.4.0。核心实现为 `src/lib/book-scene.ts`，使用锁定的 Three.js 0.180.0。册子保持「册页印刷」的纸白、墨黑、朱红，不用桌面照片模拟空间。

## 真实场景与书写

封皮是圆角硬壳几何体，带细小的程序布纹凹凸；纸块包括 17 层独立可见的纸边。左右页各有 40 × 26 网格的曲面，内页向缝合纸沟槽拱起，外沿略卷。封皮沿装订轴开合，翻日使用随进度改变顶点的弯曲纸页，包含正反两面。接触阴影和方向光阴影来自当前模型。

册页文字、日期、待办由现有手账内容绘制成内部 PNG 纹理。照片及贴纸分别建立曲面薄纸片网格，包含正面、反面和边缘，每件 338 个顶点，按 640 × 840 页面坐标定位，接受与投射真实阴影。照片纸框和日期在导入后由 Canvas 绘制，不访问外部图床。图片贴纸仍然是平面的纸品；本版本没有把花枝或山水图片伪称为独立的立体雕塑。

进入书写时，右页在真实场景内展平，镜头转为正上方；`getWritingRect()` 用相机矩阵投影其四角，返回相对 Canvas 的 CSS 像素范围。原生 DOM 文字和可拖动纸品覆盖在同一真实纸面上，场景中的对应文字与纸品隐藏，避免重叠。完成书写后，最新内容回到曲面册页。记录、历史、备份格式与原版本兼容，镜头操作不写入撤销历史。

## 接口

```ts
const book = new BookScene(host, {
  startClosed: true,
  coverColor: '#bd3e32',
  coverTitle: '日常',
  onPageClick: () => {},
  onError: message => {},
  onStateChange: state => {},
});
await book.setPageTexture(localPngDataUrl);
await book.setObjects(paperObjects);
await book.setCover({ color, title });
await book.open();
await book.flipTo(nextPageDataUrl, { direction: 'next' });
book.setMode('write');
const rect = book.getWritingRect();
book.setMode('browse');
book.resetView();
await book.close();
book.dispose();
```

纹理输入只接受内部 Canvas 或受支持的图片 data URL。调用 `dispose()` 释放几何、材质、纹理、WebGL 渲染器、事件和观察器。实例使用 `ResizeObserver` 适配舞台；画布像素比例限制在 2 以下。小屏浏览镜头偏向右页，避免整册缩成过小的模型。

## 动态与退化

指针轻移带来小幅视差；按住拖动能从不同角度看纸块和封皮，松开返回原位。封皮开合为 1100 ms、翻页为 1000 ms、书写镜头为 560 ms，均按实际经过时间计算；低帧率不会把书写镜头动画拉长。系统要求减少动画时立即完成对应姿态。相机变化不重算固定模型的阴影图，纸页、纸品或封皮形状变化才更新。

若 WebGL 创建失败或上下文中断，父级显示说明并保留普通书写入口与本地记录；不把替代方式声称为已成功渲染的 3D。

## 可核验的实际渲染

Canvas 的 `data-renderer`、`data-ready`、`data-mode`、`data-state`、`data-open`、`data-triangles`、`data-frames` 来自当前 Three.js 实例。`canvas.__journal3D.inspect()` 只读返回当前相机、册子、封皮的世界矩阵，纸页真实顶点高度范围、翻页顶点、独立纸品网格数量和顶点数。`textureHash` 对已解码页纹理的 32 × 42 RGBA 样本计算，能够核对写入后的实际纹理变化。画布保留绘图缓冲区，用于浏览器验收读取真实像素；这些读数来自场景和图像，不由测试预设。
