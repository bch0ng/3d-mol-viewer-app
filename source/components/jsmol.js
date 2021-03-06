import React, { Component } from 'react';
import { AppRegistry,
         WebView } from 'react-native';
import styles from '../styles/style';

export default class JSMol extends Component {
    componentDidMount() {
        console.log('JSMol mounted!');
    }
    
    componentDidUpdate() {
        console.log('JSMol updated');
    }

    render() {
        const rawHTML = `
            <!DOCTYPE html>
            <html>
                <title>3D Molecule Viewer</title>
                <head>
                <meta charset="utf-8">
                <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
                <script type="text/javascript" src="http://yourjavascript.com/44817082211/jsmol-lite-nojq.js"></script>
                <style>
                    html, body {
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        background-color: #212121;
                    }
                </style>
                <script type="text/javascript"> 
                    let Info;
                    ;(function() {
                        Info = {
                            color: "#212121",
                            width: '100%',
                            height: '100%',
                            addSelectionOptions: false,
                            shadeAtoms: true,
                            serverURL: "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php",
                            use: "WebGL",
                            readyFunction: null,
                            defaultModel: ":` + this.props.cid + `",
                            bondWidth: 4,
                            zoomScaling: 1.5,
                            pinchScaling: 5.0,
                            mouseDragFactor: 1,
                            touchDragFactor: 5,
                            multipleBondSpacing: 4,
                            debug: false
                        }
                    })();
                </script>
                </head>
                <body>
                <script>
                    Jmol.getTMApplet("jmol", Info)
                </script>
                </body>
            </html>`;

        return(
            <WebView
                style={ styles.modelViewer }
                source={{ html: rawHTML }}
                scrollEnabled={ false }
                bounce={ false }
                key={ this.props.cid + "_3D" }
            />
        );
    }
}