import PointTool from './point/PointTool';
import RubberbandCircleTool from './circle/RubberbandCircleTool';
import RubberbandEllipseTool from './ellipse/RubberbandEllipseTool';
import RubberbandFreehandTool from './freehand/RubberbandFreehandTool';
import RubberbandMultipolygonTool from './multipolygon/RubberbandMultipolygonTool';
import RubberbandLineTool from './line/RubberbandLineTool';
import RubberbandSegmentAnythingTool from './segmentAnything/RubberbandSegmentAnythingTool';

const ALL_TOOLS = new Set([
  'point',
  'circle',
  'ellipse',
  'freehand',
  'line',
  'multipolygon',
  'segmentanything'
]);

const SelectorPack = (anno, config) => {

  // Add configured tools, or all
  const tools = config?.tools ?
    config.tools.map(t => t.toLowerCase()) : ALL_TOOLS;

  tools.forEach(tool => {
    if (tool === 'point')
      anno.addDrawingTool(PointTool);

    if (tool === 'circle')
      anno.addDrawingTool(RubberbandCircleTool);

    if (tool === 'ellipse')
      anno.addDrawingTool(RubberbandEllipseTool);

    if (tool === 'freehand')
      anno.addDrawingTool(RubberbandFreehandTool);

    if (tool === 'multipolygon')
      anno.addDrawingTool(RubberbandMultipolygonTool);

    if (tool === 'line')
      anno.addDrawingTool(RubberbandLineTool);

    if (tool === 'segmentanything')
      anno.addDrawingTool(RubberbandSegmentAnythingTool);
  });

}

export default SelectorPack;
