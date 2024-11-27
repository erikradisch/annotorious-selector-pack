import RBush from 'rbush';
import Tool from '@recogito/annotorious/src/tools/Tool';
import RubberbandSegmentAnything from './RubberbandSegmentAnythng';
import EditableSegmentAnything from './EditableSegmentAnything';
import { isTouchDevice } from '@recogito/annotorious/src/util/Touch';

/**
 * A rubberband selector for Multipolygon fragments.
 */
class MyRBush extends RBush {
  toBBox([x, y]) { return {minX: x, minY: y, maxX: x, maxY: y}; }
  compareMinX(a, b) { return a.x - b.x; }
  compareMinY(a, b) { return a.y - b.y; }
}

const isTouch = isTouchDevice();
export const getPath = (points) => {
  const round = num => Math.round(10 * num) / 10;
  let path = ""
  for (let pointList of points){
    path += "M"
    let first = true
    for (let point of pointList){
      if (first){
        first = false
        path += round(point.x).toString() + "," + round(point.y).toString()
      } else {
        path += " L" + round(point.x).toString() + "," + round(point.y).toString()
      }
    }
    path += " Z"
  }
  return path
}
export const toSVGTarget = (points, image) => ({
  source: image?.src,
  selector: {
    type: "SvgSelector",
    value: `<svg><path d="${getPath(points)}" /></svg>`
  }
});

export default class RubberbandSegmentAnythingTool extends Tool {

  constructor(g, config, env) {
    super(g, config, env);
    this._isDrawing = false;
    this.viewer = null
    this._startOnSingleClick = false;
  }
  get isDrawing() {
    return this._isDrawing;
  }

  startDrawing = (x, y, startOnSingleClick, evt, contourPoints) => {
    console.log(evt);
    this._isDrawing = true
    this.startTime = Date.now()
    this.contourPoints = contourPoints;
    if (!startOnSingleClick){
      this._startOnSingleClick = false
    } else {
      this._startOnSingleClick = startOnSingleClick;
    }
    // this.svg.addEventListener('mousedown', this.onMouseDown);
    this.attachListeners({
      mouseMove: this.onMouseMove,
      mouseUp: this.onMouseUp,
      dblClick: this.onDblClick
    });

    this.rubberband = new RubberbandSegmentAnything([ x, y ], this.g, this.config, this.env);
    this.rubberband.on('close', ({ shape, selection }) => {
      shape.annotation = selection;
      this.emit('complete', shape);
      this.stop();
    });
  }

  stop = () => {
    this.detachListeners();

    this._isDrawing = false;

    if (this.rubberband) {
      this.rubberband.destroy();
      this.rubberband = null;
    }
  }
  undo = () =>{
    if (this.rubberband){
      this.rubberband.undo();

    }
  }


  newPart = () =>{
    if (this.rubberband){
      this.rubberband.newPart();

    }
  }
  setContourPoints(contourPoints, viewer){
  }

  onMouseMove = (x, y, evt) => {
    this.rubberband.dragTo({x: x, y: y , clickType: evt.ctrlKey? 0:1});
  }

  onMouseUp = (x, y, evt) => {
    console.log("onMouseUp", evt);

    if (evt.altKey){
      this.complete();
    } else{
        this.rubberband.addPoint({x: x, y: y , clickType: evt.ctrlKey? 0:1});
    }
  }
  onScaleChanged = scale => {
    if (this.rubberband)
      this.rubberband.onScaleChanged(scale);
  }
  scale = scale => {
  }
  complete = (x, y) => {
    this._isDrawing = false;

    const shape = this.rubberband.element;
    console.log("complete triggered", shape);

    shape.annotation = this.rubberband.toSelection();
    console.log("complete", shape);

    this.emit('complete', shape);
    this.stop();
  }

  onDblClick = (x, y) => {
    if (this.config.completeWithDoubleClick){
      this.complete(x,y);
    }
  }

  createEditableShape = annotation =>
    new EditableSegmentAnything(annotation, this.g, this.config, this.env);

}

RubberbandSegmentAnythingTool.identifier = 'segmentanything';

RubberbandSegmentAnythingTool.supports = annotation => {
  const selector = annotation.selector('SvgSelector');
  if (selector)
    return selector.value?.match(/^<svg.*<path d=/g);
}