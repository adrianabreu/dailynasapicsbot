using System;
using System.Collections.Generic;
using System.Text;

namespace DailyNasaPics.Models
{
    public class NasaMedia
    {
        public string Title { get; set; }
        public string media_type { get; set; }
        public string Url { get; set; }
        public string HdUrl { get; set; }
        public string Explanation { get; set; }
        public DateTime date { get; set; }
    }
}
