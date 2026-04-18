import CopyWebpackPlugin from 'copy-webpack-plugin'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['cesium'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      const cesiumPkg = require.resolve('cesium/package.json')
      const cesiumDir = cesiumPkg.replace(/[\\/]package\.json$/, '')
      const cesiumBuild = `${cesiumDir}/Build/Cesium`

      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            { from: `${cesiumBuild}/Workers`,    to: '../public/cesium/Workers',    noErrorOnMissing: true },
            { from: `${cesiumBuild}/ThirdParty`, to: '../public/cesium/ThirdParty', noErrorOnMissing: true },
            { from: `${cesiumBuild}/Assets`,     to: '../public/cesium/Assets',     noErrorOnMissing: true },
            { from: `${cesiumBuild}/Widgets`,    to: '../public/cesium/Widgets',    noErrorOnMissing: true },
          ],
        })
      )

      // Tell cesium where its static files live at runtime
      config.plugins.push(
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify('/cesium'),
        })
      )
    }

    return config
  },
}

export default nextConfig
