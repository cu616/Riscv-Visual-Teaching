# 参考资料说明

本目录保存 K-Star 申报、交接和后续维护可参考的材料，包括路演 PPT、交接 PPT、产品研发设计报告、经验分享文档和演示视频分卷。

`演示.mp4` 原始文件超过 GitHub LFS 单文件大小限制，因此未直接提交。仓库中保留两个分卷文件：

- `演示.mp4.part01`
- `演示.mp4.part02`

下载完整仓库并拉取 Git LFS 文件后，可在 Windows PowerShell 中执行以下命令还原视频：

```powershell
$target = [System.IO.File]::Create("演示.mp4")
try {
  foreach ($part in @("演示.mp4.part01", "演示.mp4.part02")) {
    $source = [System.IO.File]::OpenRead($part)
    try {
      $source.CopyTo($target)
    } finally {
      $source.Dispose()
    }
  }
} finally {
  $target.Dispose()
}
```

还原后得到的 `演示.mp4` 为原始演示视频。
