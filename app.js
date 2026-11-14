(() => {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#region-dialog');
  const palette = ['#b9c8ae','#d8c69a','#b7c5c2','#d7a985','#b5b38b','#c5b5a1','#a9bfad','#d4c4b4','#9eb3a9','#ddc88d'];
  const ecology = {
    'MARINE WEST COAST FOREST': ['Temperate forests shaped by Pacific moisture, with strong differences between coastal lowlands and higher mountain slopes.', 'Douglas-fir · western hemlock · western redcedar'],
    'MEDITERRANEAN CALIFORNIA': ['A Mediterranean climate brings mild, wetter winters and warm, dry summers; forests, woodlands, and shrublands vary with elevation and coastal influence.', 'Coast live oak · tanoak · ponderosa pine'],
    'NORTH AMERICAN DESERTS': ['Arid basins and plateaus with sparse, drought-adapted vegetation; elevation creates sharp local changes in temperature and plant communities.', 'Pinyon pine · juniper · mesquite'],
    'GREAT PLAINS': ['Broad grassland and prairie landscapes, with woody vegetation concentrated along waterways and in more rugged or sheltered areas.', 'Cottonwood · oak · juniper'],
    'EASTERN TEMPERATE FORESTS': ['A broad temperate region with deciduous and mixed forests, humid conditions, and strong local variation from coastal plain to upland.', 'Oak · hickory · maple'],
    'NORTHERN FORESTS': ['Cooler forest landscapes shaped by long winters, with mixed hardwood and conifer communities and wetlands in many lowlands.', 'Birch · maple · spruce'],
    'NORTHWESTERN FORESTED MOUNTAINS': ['High-relief western mountains where elevation, exposure, and snow create strong changes in forest type over short distances.', 'Douglas-fir · ponderosa pine · subalpine fir'],
    'SOUTHERN SEMIARID HIGHLANDS': ['Elevated, relatively dry landscapes where mountain forests and woodlands meet basins and plateaus.', 'Ponderosa pine · pinyon pine · juniper'],
    'TEMPERATE SIERRAS': ['Mountain landscapes with climate and vegetation patterns closely tied to elevation, slope, and seasonal moisture.', 'Pine · oak · fir'],
    'TAIGA': ['Subarctic terrain with a short growing season, extensive boreal forest, wetlands, and large areas of open or sparsely treed land.', 'Black spruce · white spruce · tamarack'],
    'TUNDRA': ['Cold, exposed landscapes with a very short growing season; trees are absent or limited in the highest and most northerly areas.', 'Trees sparse or absent; dwarf shrubs and sedges dominate'],
    'HUDSON PLAIN': ['Low-lying northern landscapes with cold conditions, extensive wetlands, and a mix of forest, shrubland, and open habitats.', 'Black spruce · tamarack · white spruce'],
    'TROPICAL DRY FORESTS': ['Warm tropical landscapes with pronounced dry seasons and vegetation adapted to seasonal water stress.', 'Oak · pine · tropical hardwoods'],
    'TROPICAL WET FORESTS': ['Warm, humid landscapes with high rainfall and dense, diverse forest communities.', 'Tropical evergreen hardwoods']
  };
  const fallback = ['This EPA Level III region is part of a broad ecological setting. Landform, elevation, soils, and local moisture distinguish it from nearby regions.', 'Tree communities vary by local habitat; consult the EPA regional description for this ecoregion.'];

  function hash(text) { let n=0; for (const c of text) n=(n*31+c.charCodeAt(0))|0; return Math.abs(n); }
  function description(feature) {
    const [summary, trees] = ecology[feature.properties.level_i] || fallback;
    return {summary, trees};
  }
  function openGuide(feature) {
    const p=feature.properties, notes=description(feature);
    $('#dialog-title').textContent=p.name;
    $('#dialog-kicker').textContent='EPA LEVEL III ECOREGION';
    $('#dialog-summary').textContent=notes.summary;
    $('#dialog-code').textContent=p.code || '—';
    $('#dialog-parent').textContent=titleCase(p.level_ii || 'Not listed');
    $('#dialog-setting').textContent=titleCase(p.level_i || 'Not listed');
    $('#dialog-ecology').textContent='Representative tree associations across this broader setting: '+notes.trees+'. These are regional examples, not a species inventory for every location.';
    if (!dialog.open) dialog.showModal();
  }
  function titleCase(text) { return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
  Promise.all([
    fetch('assets/us-states-10m.json').then(response => { if(!response.ok) throw Error('Could not load state boundaries'); return response.json(); }),
    fetch('assets/epa-level-iii-us.geojson').then(response => { if(!response.ok) throw Error('Could not load EPA ecoregions'); return response.json(); })
  ]).then(([topology, regions]) => drawMap(topology, regions))
    .catch(error => {
      const message=$('#map-error');
      if(message) message.hidden=false;
      console.error('Map setup failed:',error);
    });

  function drawMap(topology, regionData) {
    const svg=d3.select('#national-map'), node=svg.node();
    const width=node.clientWidth || 1040, height=560;
    svg.attr('viewBox',`0 0 ${width} ${height}`).attr('preserveAspectRatio','xMidYMid meet');
    const nation=topojson.feature(topology,topology.objects.nation);
    const states=topojson.feature(topology,topology.objects.states).features;
    const projection=d3.geoAlbersUsa().fitExtent([[12,12],[width-12,height-12]],nation);
    const path=d3.geoPath(projection);
    const defs=svg.append('defs');
    defs.append('clipPath').attr('id','us-clip').append('path').datum(nation).attr('d',path);
    svg.append('path').datum(nation).attr('class','us-land').attr('d',path);
    const visible=regionData.features.filter(f => path(f));
    svg.append('g').attr('clip-path','url(#us-clip)').selectAll('path').data(visible).join('path')
      .attr('class','eco-region').attr('fill',d=>palette[hash(d.properties.name)%palette.length])
      .attr('d',path).attr('tabindex','0').attr('role','button')
      .attr('aria-label',d=>`Open ${d.properties.name} ecoregion profile`)
      .on('click',(event,d)=>openGuide(d))
      .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openGuide(d);}})
      .on('pointerenter',(event,d)=>showTooltip(event,d))
      .on('pointermove',(event,d)=>positionTooltip(event))
      .on('pointerleave',hideTooltip);
    svg.append('g').selectAll('path').data(states).join('path').attr('class','state').attr('d',path).attr('pointer-events','none');
    svg.append('path').datum(nation).attr('class','us-outline').attr('d',path).attr('pointer-events','none');
    $('#map-count').textContent=`${new Set(visible.map(f=>f.properties.code)).size} EPA Level III ecoregions`;
  }
  function showTooltip(event,feature) { const tip=$('#map-tooltip');tip.textContent=feature.properties.name;tip.style.display='block';positionTooltip(event); }
  function positionTooltip(event) { const tip=$('#map-tooltip');tip.style.left=`${event.clientX+14}px`;tip.style.top=`${event.clientY+14}px`; }
  function hideTooltip() { $('#map-tooltip').style.display='none'; }
})();
