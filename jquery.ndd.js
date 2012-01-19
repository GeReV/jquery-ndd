/*
 * Copyright 2012 Amir Grozki
 * https://github.com/GeReV/jquery-ndd
 * 
 * Based on jquery-ndd plugin by Guillaume Bort
 * http://github.com/guillaumebort/jquery-ndd 
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function($, document) {
	
	var div = document.createElement('div');
	
	// Fix styles
	$(function() {
	    $('head').append('<style type="text/css">[draggable=true] {-webkit-user-drag: element; -webkit-user-select: none; -moz-user-select: none;}</style>');
	});
	
	
	$.event.props.push("dataTransfer");
	
	// Add Drag&Drop handlers
	$.each( ("drag dragenter dragleave dragover dragend drop dragstart").split(" "), function( i, name ) {
	
		// Handle event binding
		jQuery.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};
	
		if ( jQuery.attrFn ) {
			jQuery.attrFn[ name ] = true;
		}
	});
	
	var Dragger = function (el, selector, options) {
		
		options.init(el, selector, options);
		
	};
	
	$.fn.draggable = function (selector, options) {
		
		if ( typeof selector !== 'String' ) {
			options = selector;
			selector = undefined;
		}
		
		options = $.extend( Dragger.defaults, options );
		
		new Dragger( this, selector, options );
		return this;
	};
	
	$.fn.draggable.defaults = Dragger.defaults = {
		isShim: ! (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)), // Modernizr's native drag & drop test.
		init: function ( el, selector, options ) {
			var events = {
				dragstart:	options.dragstart,
				dragend:	options.dragend,
				drag:		options.drag
			};
			
			if ( !options.isShim ) {
				el.find( selector ).attr( 'draggable', true );
			}
			
			Dragger.options		= options;
			Dragger.el			= el;
			
			if ( options.isShim ) {
				
				Dragger.initialMouseX	= undefined;
				Dragger.initialMouseY	= undefined;
				Dragger.startX			= undefined;
				Dragger.startY			= undefined;
				Dragger.originalObject	= undefined;
				Dragger.draggedObject	= undefined;
				Dragger.dragEvent		= undefined;
				
				$( document ).on( 'mousedown', el.selector, Dragger.options.shim.events.mousedown).on({
					mousemove: Dragger.options.shim.events.mousemove,
					mouseup: Dragger.options.shim.events.mouseup
				});
			}
			
			el.on( events, selector );
		},
		shim: {
			events: {
				mousedown: function (e) {
					Dragger.options.shim.capture( $(e.target), e );
					
					Dragger.initialMouseX = e.clientX;
					Dragger.initialMouseY = e.clientY;
					
					return false;
				},
				mousemove: function (e) {
					if ( Dragger.draggedObject ) {
						var dX = e.clientX - Dragger.initialMouseX,
							dY = e.clientY - Dragger.initialMouseY;
						
						Dragger.options.shim.setPosition(dX,dY);
					}
				},
				mouseup: function () {
					Dragger.options.shim.release.call(this);
				}
			},
			
			capture: function (obj, evt) {
				var position = obj.offset(),
					e;
					
				e = Dragger.dragEvent = $.Event('dragstart');
				
				e.dataTransfer = Dragger.options.shim.getDataTransfer();
				e.target = evt.target;
				
				obj.trigger( e );
				
				if (Dragger.draggedObject) {
					//Dragger.options.shim.release();
				}
				
				Dragger.startX = position.left;
				Dragger.startY = position.top;
				
				Dragger.originalObject = obj;
				Dragger.draggedObject = (e.dataTransfer.effectAllowed.toLowerCase() == 'move' ? obj : obj.clone().appendTo('body'));
				
				Dragger.draggedObject.css({
					position: 'absolute',
					left: position.left,
					top: position.top
				});
			},
			
			release: function () {
				if ( Dragger.draggedObject ) {
					var e = $.Event('dragend');
					
					e.dataTransfer = Dragger.dragEvent.dataTransfer;
					e.target = Dragger.dragEvent.target;
					
					Dragger.originalObject.trigger( e );
					
					//TODO: Consider other cases.
					switch ( e.dataTransfer.effectAllowed.toLowerCase() ) {
						case 'move':
							Dragger.draggedObject.css({
								position: '',
								left: '',
								top: ''
							});
							break;
						case 'copy':
							Dragger.draggedObject.remove();
							break;
					}					
					
					Dragger.originalObject = Dragger.draggedObject = Dragger.dragEvent = null;
				}
			},
			
			setPosition: function (dx,dy) {
				Dragger.draggedObject.css({ left: Dragger.startX + dx, top: Dragger.startY + dy });
			},
			
			getDataTransfer: function () {
				return (function () {
					var items = {};
					
					function ensureFormat (format) {
						format = format.toLowerCase();
							
						if ( format == 'text' ) {
							format = 'text/plain';
						}
						if ( format == 'url' ) {
							format = 'text/uri-list';
						}
						
						return format;
					}
					
					return {
						// TODO: Improve DataTransfer interface shim. (http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#the-datatransfer-interface)
						dropEffect: 'copy',
						effectAllowed: 'copy',
						setData: function (format, value) {
							items[ ensureFormat( format ) ] = value;
						},
						getData: function (format) {
							return items[ ensureFormat( format ) ];
						},
						clearData: function (format) {
							if ( typeof format === 'undefined' ) {
								items = {};
								return;
							}
							
							delete items[ ensureFormat( format ) ];
						}
					};
				})();
			}
		}
	};
	
	// Live draggable's && droppable's
	$.fn.extend({
		
	    droppable: function(accept, enter, leave, drop) {
	        var currents = {}, uuid = 0;
	            
	        this.live('dragenter dragleave dragover drop', function(e) {
	            if(!this.uuid) {
	                this.uuid = ++uuid;
	                currents[this.uuid] = {hover: false, leaveTimeout: null};
	            }
	            
	            // TODO add custom drop effect
	            if(!e.dataTransfer.dropEffect && e.dataTransfer.effectAllowed) {
	                switch(e.dataTransfer.effectAllowed) {
	                    case 'none': e.dataTransfer.dropEffect = 'none'; break
	                    case 'copy': e.dataTransfer.dropEffect = 'copy'; break
	                    case 'move': e.dataTransfer.dropEffect = 'move'; break
	                    case 'link': e.dataTransfer.dropEffect = 'link'; break
	                    case 'copyMove': e.dataTransfer.dropEffect = 'copy'; break
	                    case 'copyLink': e.dataTransfer.dropEffect = 'copy'; break
	                    case 'linkMove': e.dataTransfer.dropEffect = 'move'; break
	                    case 'all': e.dataTransfer.dropEffect = 'copy'; break
	                }
	            }
	            
	            if(e.type == 'dragenter' || e.type == 'dragover') {
	                clearTimeout(currents[this.uuid].leaveTimeout);
	                
	                if(!currents[this.uuid].hover) {
	                    var accepted = false;
	                    if(jQuery.isFunction(accept)) {
	                        accepted = accept.apply(this, [e])
	                    } else {
	                        var types = accept.toString().split(' ');
	                        for(var i=0; i<types.length; i++) {
	                            var type = types[i];
	                            
	                            if(type.toLowerCase() == 'text') {
                  					type = 'text/plain';
	                            }
	                            if(type.toLowerCase() == 'url') {
	                                type = 'text/uri-list';
	                            }
	                            if(type == '*') {
	                                accepted = true;
	                                break;
	                            }
	                            if(type == 'Files') {
	                                
	                                // Fix Safari Mac (seems fixed in webkit nightly)
	                                for(var ii=0; ii<e.dataTransfer.types.length; ii++) {
	                                    if('public.file-url' == e.dataTransfer.types[ii]) {
	                                        accepted = true;
	                                        break;
	                                    }
	                                }
	                            }
	                            
	                            if(e.dataTransfer.types) {
	                                for(var ii=0; ii<e.dataTransfer.types.length; ii++) {
	                                    if(type == e.dataTransfer.types[ii]) {
	                                        accepted = true;
	                                        break;
	                                    }
	                                }
	                            }
	                        }
	                    }
	                
	                    if(accepted) {
	                        e.preventDefault();
	                        if(enter) enter.apply(this, [e]);
	                        currents[this.uuid].hover = true;
	                    }
	                } else {
	                    e.preventDefault();
	                }
	            } 
	             
	            if(e.type == 'dragleave') {
	                if(currents[this.uuid].hover) {
	                    var self = this;
	                    currents[this.uuid].leaveTimeout = setTimeout(function() {
	                        if(leave) leave.apply(self, [e]);
	                        currents[self.uuid].hover = false;
	                    }, 50);
	                }
	            }  
	            
	            if(e.type == 'drop') {
	                if(currents[this.uuid].hover) {
	                    if(leave) leave.apply(this, [e]);
	                    currents[this.uuid].hover = false;
	                    if(drop) drop.apply(this, [e]);
	                    e.preventDefault();
	                }
	            }
	                
	        });
	                
	    }
	
	});

})(jQuery, document);

