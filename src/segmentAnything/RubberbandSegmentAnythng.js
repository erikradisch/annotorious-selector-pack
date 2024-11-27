import { Selection, ToolLike } from '@recogito/annotorious/src/tools/Tool';
import { toSVGTarget } from '@recogito/annotorious/src/selectors/EmbeddedSVG';
import { SVG_NAMESPACE } from '@recogito/annotorious/src/util/SVG';
import 'regenerator-runtime/runtime';
import { getPoints} from "./EditableSegmentAnything";
import axios from 'axios'
import './index.scss'

//import Mask from './MultipolygonMask';
// TODO optional: mask to dim the outside area
//import Mask from './multipolygonMask';

/**
 * A 'rubberband' selection tool for creating multipolygon drawing by
 * clicking and dragging.
 */
export default class RubberbandSegmentAnythng extends ToolLike  {

  constructor(anchor, g, config, env) {
    super(g, config, env);
    console.log("RubberbandSegmentAnythng", anchor, g, config, env);

    console.log(g, config, env.image);
    this.IMAGE_PATH = env.image.src;
    this.LONG_SIDE_LENGTH = 1024;
    this.image = null
    this.model = null
    this.modelProcessing = false
    this.tensor = null
    this.modelScale = null
    this.maskImg = null
    this.points = [];
    this.isOverPoint = false
    this.handles = []
    this.mousepos = anchor;
    this.draggingPoint = null
    this.env = env;
    this.scale = 1;
    this.elementGroup = document.createElementNS(SVG_NAMESPACE, 'g');
    this.elementGroup.setAttribute('class', 'a9s-annotation segment-anything');
    this.draggedElement = document.createElementNS(SVG_NAMESPACE, 'g');
    this.draggedElement.setAttribute('class', 'a9s-annotation segment-anything');
    this.maskElement = document.createElementNS(SVG_NAMESPACE, 'g');
    this.maskElement.setAttribute('class', 'a9s-inner');
    this.maskElement.setAttribute('class', 'segment-anything-mask');
    this.elementGroup.appendChild(this.draggedElement)
    this.elementGroup.appendChild(this.maskElement)

    this.outer = document.createElementNS(SVG_NAMESPACE, 'path');
    this.outer.setAttribute('class', 'a9s-outer');

    this.inner = document.createElementNS(SVG_NAMESPACE, 'path');
    this.inner.setAttribute('class', 'a9s-inner');


    g.appendChild(this.elementGroup);
  }

  onGrab = element => evt => {
    console.log("onGrab", element, evt);

    if (evt.button !== 0) return;  // left click
    evt.stopPropagation();

    this.grabbedElement = element;
    this.grabbedAt = this.getSVGPoint(evt);
    this.lastMouseDown = new Date().getTime();

  }
  onMoveCornerHandle = (pos, evt) => {
    let handleIdx = -1
    let cornerHandleIdx = 0
    handleIdx = this.handles.indexOf(this.grabbedElement);

    // Update selection

    // Compute offsets between selected points from current selected
    const points = getPoints(this.shape);

    const distances = this.selected.map(idx => {
      const handleXY = points[cornerHandleIdx][handleIdx];
      const thisXY = points[cornerHandleIdx][idx];

      return {
        index: idx,
        dx: thisXY.x - handleXY.x,
        dy: thisXY.y - handleXY.y
      }
    });
    let cornerHandleIdxUpdate = 0
    let updatedPoints = []
    for (let points of getPoints(this.shape)){
      if (cornerHandleIdxUpdate === cornerHandleIdx){
        let updatedPointList = points.map((pt, idx) => {
          if (idx === handleIdx) {
            // The dragged point
            return pos;
          } else if (this.selected.includes(idx)) {
            const { dx, dy } = distances.find(d => d.index === idx);
            return {
              x: pos.x + dx,
              y: pos.y + dy
            }
          } else {
            // Unchanged
            return pt;
          }
        });
        updatedPoints.push(updatedPointList);
      } else {
        updatedPoints.push(points)
      }
      cornerHandleIdxUpdate += 1
    }
    this.setPoints(updatedPoints);
  }

  onMouseover = element => evt => {

    this.isOverPoint = true
    this.grabbedElement = element;
    this.grabbedAt = this.getSVGPoint(evt);

    console.log("oMouseover", element, evt, this.isOverPoint);
  }
  onMouseout = element => evt => {
    this.isOverPoint = false
    console.log("oMouseout", element, evt, this.isOverPoint);
  }
  setPoints = (points, force) => {
    if (!this.modelProcessing || force){
      this.modelProcessing = true
      var input_points = []
      var input_labels = []
      for (var point of points){
        input_points.push([point.x, point.y]);
        input_labels.push(point.clickType)
      }
      const data = {
        "image": this.IMAGE_PATH,
        "input_points" : input_points,
        "input_labels" : input_labels
      }
      axios({
        url: this.config.serverUrl,
        method: 'post',
        data: data
      }).then( res => {
        console.log("res", res);

          this.maskElement.innerHTML = res.data.mask
          this.maskElement.firstChild.classList.add("a9s-inner")
          this.modelProcessing = false
      })
    }
  };
  close = () => {
    console.log("closing");

    const multipolygon = new multipolygon(toSVGTarget(this.points, this.env.image));
    this.emit('close', { shape: this.multipolygon, multipolygon });
  }

  getBoundingClientRect = () => {
     return this.outer.getBoundingClientRect();
  }

  dragTo = xy => {
    // Make visible
    while (this.draggedElement.firstChild) {
      this.draggedElement.removeChild(this.draggedElement.lastChild);
    }
    if (!this.isOverPoint){
      this.mousepos = xy;
      const handle = this.drawHandle(xy.x, xy.y);
      if (xy.clickType === 0){
        handle.classList.add("remove");
      } else {
        handle.classList.add("add");
      }
      this.draggedElement.appendChild(handle);
      this.scaleHandle(this.draggedElement.firstChild);
      this.setPoints( [ ...this.points, xy], false)
    }
  }
  onScaleChanged = scale => {
    if (this.draggedElement.firstChild)
      this.scaleHandle(this.draggedElement.firstChild)
    this.scale = scale;
    const radius = scale * (this.config.handleRadius || 6);
    for (let handle of this.handles){
      this.scaleHandle(handle.firstChild);
      handle.setAttribute('r', 5 * radius);
    }


//    inner.setAttribute('r', radius);
//    outer.setAttribute('r', radius);
  }

  addPoint = xy => {
    console.log("addpoint", xy, this.isOverPoint);
    if (!this.isOverPoint){
      this.points.push(xy)
      const handle = this.drawHandle(xy.x, xy.y);
      if (xy.clickType === 0){
        handle.classList.add("remove");
      } else {
        handle.classList.add("add");
      }
      handle.addEventListener('mousedown', evt => {
        console.log('Mousedown auf:', evt.target);
      });
      handle.addEventListener('mouseover', this.onMouseover(handle));
      handle.addEventListener('mouseout', this.onMouseout(handle));
      window.addEventListener('mousedown', evt => {
        console.log('Mousedown auf:', evt.target);
      });
      console.log(this.elementGroup);
      this.handles.push(handle)
      this.elementGroup.appendChild(handle);
      this.setPoints(this.points, true)
    }
  }
  undo = () => {
    this.pop()
  }

  isClosable = () => {
    const d = this.getDistanceToStart();
    return d < 6 * this.scale;
  }
  /** Removes last corner **/
  pop = () => {
    if (this.points[this.points.length - 1].length>2){
      this.points[this.points.length - 1].pop();
    } else {
      if (this.points.length>1){
        this.points.pop()
      }
    }
    this.setPoints(this.points, true);
    // this.mask.redraw();
  }

  newPart = () => {
    this.points.push([]);
  }

  get element() {
    return this.maskElement;
  }
  getDistanceToStart = () => {
    if (this.points[this.points.length-1].length < 3)
      return Infinity; // Just return if not at least 3 points

    const dx = Math.abs(this.mousepos[0] - this.points[this.points.length-1][0][0]);
    const dy = Math.abs(this.mousepos[1] - this.points[this.points.length-1][0][1]);

    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) / this.scale;
  }

  destroy = () => {
    this.elementGroup.parentNode.removeChild(this.elementGroup);
    this.multipolygon = null;
    this.elementGroup = null;
  }
  toSelection = () => {
    return new Selection({...toSVGTarget(this.elementGroup, this.env.image), renderedVia: {
      name: 'segmentanything'
    }});
  }
}
