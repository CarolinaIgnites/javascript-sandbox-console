const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');

const encode = require("./src/encode.js");

module.exports = {
  entry : {'sandbox' : './src/index.js'},
  output : {
    path : path.join(__dirname, 'dist'),
    filename : 'bundle.[name].js',
    publicPath : '/static/'
  },
  module : {
    rules : [
      {test : /\.css$/, loaders : [ 'style-loader', 'css-loader' ]},
      {
        test : /\.(svg|gif|png|eot|woff|woff2|ttf)$/,
        loaders : [ 'url-loader' ]
      },
      {
        test : /\.html$/i,
        loader : 'html-loader',
      },
    ]
  },
  plugins : [
    new HtmlWebpackPlugin({
      template : 'src/sandbox.html',
      filename : 'index.html',
    }),
    new webpack.DefinePlugin({
      CONSOLE_SCRIPT : `"${encode.ENCODED}"`
    }),
  ],
  devServer : {contentBase : path.join(__dirname, 'dist'), hot : true},
}
