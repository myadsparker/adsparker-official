'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

const config = {
  rotationDelay: 0,
  scaleFactor: 0.75,
  degPerSec: 6,
  angles: { x: -100, y: -20, z: 0 },
  colors: {
    water: '#87CEEB',
    land: '#F5F5DC',
    saudiArabia: '#E2B714',
    hover: '#D3D3D3',
  },
};

const state = {
  currentCountry: null,
  lastTime: d3.now(),
  degPerMs: config.degPerSec / 1000,
  isDragging: false,
  startX: 0,
  startY: 0,
  saudiArabia: null,
};

const Globe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countryLabelRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<any>(null);
  const autorotateRef = useRef<any>(null);
  const landRef = useRef<any>(null);
  const countriesRef = useRef<any>(null);
  const countryListRef = useRef<any>(null);
  const projectionRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !countryLabelRef.current) return;

    // Initialize elements
    elementsRef.current = {
      countryLabel: d3.select(countryLabelRef.current),
      canvas: d3.select(canvasRef.current),
      context: canvasRef.current.getContext('2d'),
    };

    // Initialize projection and path
    projectionRef.current = d3.geoOrthographic().precision(0.1);
    pathRef.current = d3
      .geoPath(projectionRef.current)
      .context(elementsRef.current.context);

    const setAngles = () => {
      const rotation = projectionRef.current.rotate();
      rotation[0] = config.angles.x;
      rotation[1] = config.angles.y;
      rotation[2] = config.angles.z;
      projectionRef.current.rotate(rotation);
    };

    const scale = () => {
      // Get the container dimensions instead of window dimensions
      const container = canvasRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;

      // Set canvas dimensions to match container
      elementsRef.current.canvas.attr('width', width).attr('height', height);
      projectionRef.current
        .scale(Math.min(width, height) / 2)
        .translate([width / 2, height / 2]);
      render();
    };

    const startRotation = (delay: number) => {
      if (autorotateRef.current) {
        autorotateRef.current.restart(rotate, delay || 0);
      }
    };

    const dragstarted = (event: any) => {
      state.isDragging = true;
      state.startX = event.x;
      state.startY = event.y;
      if (autorotateRef.current) {
        autorotateRef.current.stop();
      }
    };

    const dragged = (event: any) => {
      if (!state.isDragging) return;

      const sensitivity = 0.25;
      const dx = (event.x - state.startX) * sensitivity;
      const dy = (event.y - state.startY) * sensitivity;

      state.startX = event.x;
      state.startY = event.y;

      const rotation = projectionRef.current.rotate();
      rotation[0] += dx;
      rotation[1] -= dy;
      projectionRef.current.rotate(rotation);

      render();
    };

    const dragended = () => {
      state.isDragging = false;
      startRotation(config.rotationDelay);
    };

    const render = () => {
      const { context, canvas } = elementsRef.current;
      const width = canvas.attr('width') || 0;
      const height = canvas.attr('height') || 0;
      context.clearRect(0, 0, width, height);

      fill({ type: 'Sphere' }, config.colors.water);
      fill(landRef.current, config.colors.land);

      if (state.saudiArabia) {
        elementsRef.current.countryLabel.style(
          'color',
          config.colors.saudiArabia
        );
        fill(state.saudiArabia, config.colors.saudiArabia);
      }

      if (state.currentCountry && state.currentCountry !== state.saudiArabia) {
        elementsRef.current.countryLabel.style('color', 'white');
        fill(state.currentCountry, config.colors.hover);
      }
    };

    const fill = (obj: any, color: string) => {
      elementsRef.current.context.beginPath();
      pathRef.current(obj);
      elementsRef.current.context.fillStyle = color;
      elementsRef.current.context.fill();
    };

    const rotate = (elapsed: number) => {
      const now = d3.now();
      const diff = now - state.lastTime;
      if (diff < elapsed) {
        const rotation = projectionRef.current.rotate();
        rotation[0] += diff * state.degPerMs;
        projectionRef.current.rotate(rotation);
        render();
      }
      state.lastTime = now;
    };

    const loadData = async (cb: (world: any, cList: any) => void) => {
      try {
        const world = await d3.json(
          'https://unpkg.com/world-atlas@2.0.2/countries-110m.json'
        );
        let countryNames = await d3.tsv(
          'https://gist.githubusercontent.com/mbostock/4090846/raw/07e73f3c2d21558489604a0bc434b3a5cf41a867/world-country-names.tsv'
        );
        if (countryNames[110]) {
          countryNames[110].name = 'Palestine';
        }
        cb(world, countryNames);
      } catch (error) {
        console.error('Error loading world data:', error);
      }
    };

    const getCountry = (event: any) => {
      const pos = projectionRef.current.invert(d3.pointer(event));
      return countriesRef.current?.features.find((f: any) =>
        f.geometry.coordinates.find(
          (c1: any) =>
            d3.polygonContains(c1, pos) ||
            c1.some((c2: any) => d3.polygonContains(c2, pos))
        )
      );
    };

    const mousemove = (event: any) => {
      const country = getCountry(event);
      if (!country) {
        if (state.currentCountry) {
          leave(state.currentCountry);
          state.currentCountry = null;
          render();
        }
        return;
      }
      if (country === state.currentCountry) {
        return;
      }
      state.currentCountry = country;
      render();
      enter(country);
    };

    const enter = (country: any) => {
      const name =
        countryListRef.current?.find(
          (c: any) => parseInt(c.id) === parseInt(country.id)
        )?.name || '';
      elementsRef.current.countryLabel.text(name);
    };

    const leave = (country: any) => {
      elementsRef.current.countryLabel.text('');
    };

    const init = () => {
      setAngles();
      elementsRef.current.canvas
        .call(
          d3
            .drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        )
        .on('mousemove', mousemove)
        .on('touchmove', mousemove);

      loadData((world, cList) => {
        landRef.current = feature(world, (world as any).objects.land);
        countriesRef.current = feature(world, (world as any).objects.countries);
        countryListRef.current = cList;

        state.saudiArabia = countriesRef.current?.features.find(
          (country: any) => {
            const countryData = countryListRef.current?.find(
              (c: any) => parseInt(c.id, 10) === parseInt(country.id, 10)
            );
            return countryData && countryData.name === 'Saudi Arabia';
          }
        );

        // Add resize observer for container size changes
        resizeObserverRef.current = new ResizeObserver(() => {
          scale();
        });

        if (canvasRef.current?.parentElement) {
          resizeObserverRef.current.observe(canvasRef.current.parentElement);
        }

        window.addEventListener('resize', scale);
        scale();
        autorotateRef.current = d3.timer(rotate);
      });
    };

    init();

    // Cleanup
    return () => {
      if (autorotateRef.current) {
        autorotateRef.current.stop();
      }
      window.removeEventListener('resize', scale);

      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className='globe-container'>
      <div ref={countryLabelRef} className='country-label'></div>
      <canvas ref={canvasRef} className='globe-canvas'></canvas>
    </div>
  );
};

export default Globe;
