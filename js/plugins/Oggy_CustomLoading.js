//=============================================================================
// Oggy_CustomLoading.js
//=============================================================================

/*:
* @plugindesc v1.00 This plugin customizes a loading ui
* @author o_ggy http://www.oggy-rpg.com/
*
* @help
* (C)2019 o_ggy
* This software is released under the MIT License.
* http://opensource.org/licenses/mit-license.php
*/

(function() {

    Graphics.setLoadingImage = function(src) {
        // not use loading image
    };

    Graphics._paintUpperCanvas = function() {
        this._clearUpperCanvas();
        if (this._loadingCount >= 20) {
            var context = this._upperCanvas.getContext('2d');
            var dx = this._width / 2;
            var dy = this._height / 2;
            var alpha = ((this._loadingCount - 20) / 30).clamp(0, 1);
            context.save();
            context.globalAlpha = alpha;
            var frame = Math.floor((this._loadingCount - 20) / 8);
            var div = 12;
            var size = 24;
            var radius = 4;
            for (var i = 0; i < div; ++i) {
                context.beginPath();
                var theta = i * 2 * Math.PI / div;
                context.arc(dx + size * Math.cos(theta), dy + size * Math.sin(theta), radius, 0, Math.PI*2, false);
                var brightLevel = Math.max(3 - Math.abs(frame % div - i), 0);
                context.fillStyle = ["#666666", "#999999", "#cccccc", "#ffffff"][brightLevel];
                context.fill();
            }
            context.restore();
        }
    };

    Graphics._setupProgress = function(){
        this._progressElement = document.createElement('div');
        this._progressElement.id = 'loading-progress';
        this._progressElement.width = 300;
        this._progressElement.height = 50;
        this._progressElement.style.visibility = 'hidden';

        this._barElement = document.createElement('div');
        this._barElement.id = 'loading-bar';
        this._barElement.style.width = '100%';
        this._barElement.style.height = '10%';
        this._barElement.style.background = 'linear-gradient(to top, darkgray, gray)';
        this._barElement.style.border = '2px solid lightgray';
        this._barElement.style.borderRadius = '15px';
        this._barElement.style.marginTop = '40%';

        this._filledBarElement = document.createElement('div');
        this._filledBarElement.id = 'loading-filled-bar';
        this._filledBarElement.style.width = '0%';
        this._filledBarElement.style.height = '100%';
        this._filledBarElement.style.background = 'linear-gradient(to top, #1685ad, #269dc9)';
        this._filledBarElement.style.borderRadius = '5px';

        this._progressElement.appendChild(this._barElement);
        this._barElement.appendChild(this._filledBarElement);
        this._updateProgress();

        document.body.appendChild(this._progressElement);
    };

})();