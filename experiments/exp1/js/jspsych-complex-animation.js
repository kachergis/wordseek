/**
 * jsPsych plugin for showing animated scenes with audio 
 * and recording screen clicks
 * George Kachergis
 * documentation: docs.jspsych.org
 */

jsPsych.plugins["complex-animation"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('complex-animation', 'stimuli', 'image');
  jsPsych.pluginAPI.registerPreload('complex-animation', 'audio', 'audio');

  plugin.info = {
    name: 'complex-animation',
    description: '',
    parameters: {
      stimuli: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Stimuli',
        default: undefined,
        array: true,
        description: 'The sequence of images to be displayed.'
      },
      scene_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Scene HTML',
        default: '',
        array: true,
        description: 'HTML in which the animated stimulus (class=agent) is embedded.'
      },
      frame_time: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Frame time',
        default: 250,
        description: 'Duration to display each image.'
      },
      frame_isi: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Frame gap',
        default: 0,
        description: 'Length of gap to be shown between each image.'
      },
      sequence_reps: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Sequence repetitions',
        default: 1,
        description: 'Number of times to show entire sequence.'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        default: undefined,
        array: true,
        description: 'Class of images that should be clickable as responses.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below stimulus.'
      },
      audio: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Audio',
        default: null,
        description: 'Array of audio file names to be played as animation changes.'
      }
    }
  }
  

  plugin.trial = function(display_element, trial) {

    var interval_time = trial.frame_time + trial.frame_isi;
    var animate_frame = -1;
    var reps = 0;
    var startTime = (new Date()).getTime();
    var animation_sequence = [];
    var responses = [];
    var current_stim = "";

    // setup audio
    // var context = jsPsych.pluginAPI.audioContext();
    // if(context !== null){
    //   var source = context.createBufferSource();
    //   source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.audio[0]); // loop over?
    //   source.connect(context.destination);
    // } else {
    //   var audio = jsPsych.pluginAPI.getAudioBuffer(trial.audio[0]);
    //   audio.currentTime = 0;
    // }

    // var audio = [];
    // for (var i = 0; i < trial.audio.length - 1; i++) {
    //   var tmp = new Audio(trial.audio[i]);
    //   tmp.preload = "auto";
    //   audio.append(tmp);
    // }
    var goodbye = new Audio('sounds/goodbye.mp3');
    goodbye.preload = "auto";


    var animate_interval = setInterval(function() {
      var showImage = true;
      display_element.innerHTML = trial.scene_html; //''; // clear everything
      animate_frame++;
      if (animate_frame == trial.stimuli.length) {
        $('.bag').on({
           'click': function(){
               // get id of bag clicked on, and store data
               var id = $(this).attr('id');
               console.log("Clicked bag " + id);
               //$(this).css('border', "solid 2px red"); 
               //$(this).hide(); 
               $('.bag').off("click"); // no more clicking
               $(this).css('opacity', "0.0");
               setTimeout(function(){ 
                  after_response(id);
                  goodbye.play();
                  $('.agent').attr('src','images/Bear_disappear.png');
                  $('.bag').css('opacity', "0.0"); // also disappear unclicked bag
               }, 1000);

               setTimeout(function(){ 
                  endTrial(); 
               }, 2500);
            }
        });

        animate_frame = 0;
        reps++;
        if (reps >= trial.sequence_reps) {
          //endTrial();
          clearInterval(animate_interval);
          showImage = false;
        }
      }
      if (showImage) {
        show_next_frame();
      }
    }, interval_time);


    function show_next_frame() {
      // show image
      //display_element.innerHTML = '<img src="'+trial.stimuli[animate_frame]+'" id="jspsych-animation-image"></img>';
      // replace agent with next image
      $('.agent').attr('src',trial.stimuli[animate_frame]);

      current_stim = trial.stimuli[animate_frame];

      var context = jsPsych.pluginAPI.audioContext();
      if(context !== null){
        var source = context.createBufferSource();
        source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.audio[animate_frame]); // loop over?
        source.connect(context.destination);
      } else {
        var audio = jsPsych.pluginAPI.getAudioBuffer(trial.audio[animate_frame]);
        audio.currentTime = 0;
      }

      if(context !== null){
        startTime = context.currentTime;
        source.start(startTime);
      } else {
        audio.play();
      }

      // record when image was shown
      animation_sequence.push({
        "stimulus": trial.stimuli[animate_frame],
        "time": (new Date()).getTime() - startTime
      });

      if (trial.prompt !== null) {
        display_element.innerHTML += trial.prompt[animate_frame];
      }

      if (trial.frame_isi > 0) {
        jsPsych.pluginAPI.setTimeout(function() {
          display_element.querySelector('#jspsych-animation-image').style.visibility = 'hidden';
          current_stim = 'blank';
          // record when blank image was shown
          animation_sequence.push({
            "stimulus": 'blank',
            "time": (new Date()).getTime() - startTime
          });
        }, trial.frame_time);
      }
    }

    var after_response = function(bag) {
      responses.push({
        bag_clicked: bag
      });
    }

    function endTrial() {

      var trial_data = {
        "animation_sequence": JSON.stringify(animation_sequence),
        "responses": JSON.stringify(responses)
      };

      jsPsych.finishTrial(trial_data);
    }
  };

  return plugin;
})();
